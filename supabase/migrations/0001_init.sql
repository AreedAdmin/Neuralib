-- Neurolib initial schema
-- Single-user knowledge library, LaTeX-only cards.
-- Subjects → Cards → Compositions, with versions, tags, links, assets, exports.

create schema if not exists neuralib;

-- pg_trgm for fuzzy title/summary search; lives in the extensions schema on Supabase
create extension if not exists pg_trgm with schema extensions;

-- ============================================================================
-- SUBJECTS — hierarchical taxonomy (Algorithms → Graph Algorithms → PageRank)
-- ============================================================================

create table neuralib.subjects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  parent_id   uuid references neuralib.subjects(id) on delete cascade,
  slug        text not null,
  name        text not null,
  description text,
  icon        text,
  color       text,
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, parent_id, slug)
);
create index subjects_owner_parent_position_idx
  on neuralib.subjects (owner_id, parent_id, position);

-- ============================================================================
-- CARDS — LaTeX leaves
-- ============================================================================

create type neuralib.card_format as enum ('latex_fragment', 'latex_doc');
create type neuralib.card_status as enum ('draft', 'published', 'archived');

create table neuralib.cards (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  subject_id    uuid not null references neuralib.subjects(id) on delete restrict,
  slug          text not null,
  title         text not null,
  summary       text,
  format        neuralib.card_format not null default 'latex_fragment',
  content       text not null default '',
  content_plain text not null default '',
  status        neuralib.card_status not null default 'draft',
  search_vector tsvector,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, subject_id, slug)
);
create index cards_search_idx       on neuralib.cards using gin (search_vector);
create index cards_title_trgm_idx   on neuralib.cards using gin (title   extensions.gin_trgm_ops);
create index cards_summary_trgm_idx on neuralib.cards using gin (summary extensions.gin_trgm_ops);

-- Strip TeX commands so FTS sees prose, not markup noise
create or replace function neuralib.strip_tex(src text) returns text
language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(coalesce(src, ''), '%[^\n]*', '', 'g'),
           '\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{([^{}]*)\})?', '\3 ', 'g'),
         '\$+[^$]*\$+', ' ', 'g')
$$;

create or replace function neuralib.cards_refresh_search_vector()
returns trigger language plpgsql as $$
begin
  new.content_plain := neuralib.strip_tex(new.content);
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')),         'A') ||
    setweight(to_tsvector('english', coalesce(new.summary, '')),       'B') ||
    setweight(to_tsvector('english', coalesce(new.content_plain, '')), 'C');
  new.updated_at := now();
  return new;
end $$;

create trigger trg_cards_refresh_search_vector
before insert or update of title, summary, content on neuralib.cards
for each row execute function neuralib.cards_refresh_search_vector();

-- ============================================================================
-- CARD VERSIONS — append-only history
-- ============================================================================

create table neuralib.card_versions (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references neuralib.cards(id) on delete cascade,
  version    int  not null,
  content    text not null,
  format     neuralib.card_format not null,
  message    text,
  created_at timestamptz not null default now(),
  unique (card_id, version)
);
create index card_versions_card_idx on neuralib.card_versions (card_id, version desc);

-- ============================================================================
-- TAGS
-- ============================================================================

create table neuralib.tags (
  id       uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name     text not null,
  color    text,
  unique (owner_id, name)
);

create table neuralib.card_tags (
  card_id uuid references neuralib.cards(id) on delete cascade,
  tag_id  uuid references neuralib.tags(id)  on delete cascade,
  primary key (card_id, tag_id)
);

-- ============================================================================
-- ASSETS — images / diagrams uploaded to the neuralib-assets bucket
-- ============================================================================

create table neuralib.assets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  card_id      uuid references neuralib.cards(id) on delete cascade,
  storage_path text not null,
  filename     text not null,
  mime_type    text,
  bytes        int,
  created_at   timestamptz not null default now()
);
create index assets_card_idx on neuralib.assets (card_id);

-- ============================================================================
-- CARD LINKS — graph of relationships between concepts
-- ============================================================================

create type neuralib.link_kind as enum ('depends_on', 'related', 'extends', 'cites');

create table neuralib.card_links (
  id              uuid primary key default gen_random_uuid(),
  source_card_id  uuid not null references neuralib.cards(id) on delete cascade,
  target_card_id  uuid not null references neuralib.cards(id) on delete cascade,
  kind            neuralib.link_kind not null default 'related',
  note            text,
  created_at      timestamptz not null default now(),
  check (source_card_id <> target_card_id),
  unique (source_card_id, target_card_id, kind)
);
create index card_links_source_idx on neuralib.card_links (source_card_id);
create index card_links_target_idx on neuralib.card_links (target_card_id);

-- ============================================================================
-- COMPOSITIONS — ordered card collections rendered to a single PDF
-- ============================================================================

create type neuralib.composition_kind as enum
  ('textbook', 'cheatsheet', 'lecture', 'note_pack', 'custom');

create table neuralib.compositions (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  slug          text not null,
  title         text not null,
  subtitle      text,
  description   text,
  kind          neuralib.composition_kind not null default 'custom',
  cover_color   text,
  preface       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, slug)
);

create type neuralib.entry_kind as enum ('card', 'heading', 'page_break', 'raw');

create table neuralib.composition_entries (
  id             uuid primary key default gen_random_uuid(),
  composition_id uuid not null references neuralib.compositions(id) on delete cascade,
  position       int  not null,
  kind           neuralib.entry_kind not null default 'card',
  card_id        uuid references neuralib.cards(id) on delete restrict,
  heading_level  int,
  heading_text   text,
  raw_content    text,
  unique (composition_id, position)
);
create index composition_entries_comp_pos_idx
  on neuralib.composition_entries (composition_id, position);

-- ============================================================================
-- EXPORTS — cached rendered PDFs keyed by content hash
-- ============================================================================

create table neuralib.exports (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  card_id        uuid references neuralib.cards(id) on delete cascade,
  composition_id uuid references neuralib.compositions(id) on delete cascade,
  format         text not null,
  content_hash   text,
  storage_path   text,
  bytes          int,
  status         text not null default 'pending',
  error          text,
  created_at     timestamptz not null default now(),
  check (
    (card_id is not null and composition_id is null) or
    (card_id is null and composition_id is not null)
  )
);
create index exports_lookup_idx on neuralib.exports (owner_id, content_hash);

-- ============================================================================
-- updated_at maintenance
-- ============================================================================

create or replace function neuralib.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_subjects_updated_at
before update on neuralib.subjects
for each row execute function neuralib.touch_updated_at();

create trigger trg_compositions_updated_at
before update on neuralib.compositions
for each row execute function neuralib.touch_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY — auth.uid() = owner_id everywhere
-- ============================================================================

alter table neuralib.subjects             enable row level security;
alter table neuralib.cards                enable row level security;
alter table neuralib.card_versions        enable row level security;
alter table neuralib.tags                 enable row level security;
alter table neuralib.card_tags            enable row level security;
alter table neuralib.assets               enable row level security;
alter table neuralib.card_links           enable row level security;
alter table neuralib.compositions         enable row level security;
alter table neuralib.composition_entries  enable row level security;
alter table neuralib.exports              enable row level security;

create policy "subjects: owner only" on neuralib.subjects
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "cards: owner only" on neuralib.cards
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "card_versions: via parent card" on neuralib.card_versions
  for all
  using (exists (
    select 1 from neuralib.cards c
    where c.id = card_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from neuralib.cards c
    where c.id = card_id and c.owner_id = (select auth.uid())
  ));

create policy "tags: owner only" on neuralib.tags
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "card_tags: via parent card" on neuralib.card_tags
  for all
  using (exists (
    select 1 from neuralib.cards c
    where c.id = card_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from neuralib.cards c
    where c.id = card_id and c.owner_id = (select auth.uid())
  ));

create policy "assets: owner only" on neuralib.assets
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "card_links: via source card" on neuralib.card_links
  for all
  using (exists (
    select 1 from neuralib.cards c
    where c.id = source_card_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from neuralib.cards c
    where c.id = source_card_id and c.owner_id = (select auth.uid())
  ));

create policy "compositions: owner only" on neuralib.compositions
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "composition_entries: via parent composition" on neuralib.composition_entries
  for all
  using (exists (
    select 1 from neuralib.compositions c
    where c.id = composition_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from neuralib.compositions c
    where c.id = composition_id and c.owner_id = (select auth.uid())
  ));

create policy "exports: owner only" on neuralib.exports
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ============================================================================
-- SEARCH RPC — combined FTS + trigram fallback, returns headlined snippets
-- ============================================================================

create or replace function neuralib.search_cards(q text, lim int default 25)
returns table (
  id         uuid,
  title      text,
  summary    text,
  subject_id uuid,
  rank       real,
  snippet    text
)
language sql
stable
security invoker
set search_path = neuralib, extensions, pg_temp
as $$
  select
    c.id,
    c.title,
    c.summary,
    c.subject_id,
    (ts_rank(c.search_vector, websearch_to_tsquery('english', q))
       + similarity(c.title, q) * 0.3)::real as rank,
    ts_headline(
      'english',
      c.content_plain,
      websearch_to_tsquery('english', q),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=5'
    ) as snippet
  from neuralib.cards c
  where c.owner_id = (select auth.uid())
    and (
      c.search_vector @@ websearch_to_tsquery('english', q)
      or c.title % q
      or coalesce(c.summary, '') % q
    )
  order by rank desc
  limit lim;
$$;

-- Allow authenticated users to call the RPC (RLS still scopes results to owner)
grant usage on schema neuralib to authenticated;
grant execute on function neuralib.search_cards(text, int) to authenticated;
grant select, insert, update, delete on all tables in schema neuralib to authenticated;
alter default privileges in schema neuralib
  grant select, insert, update, delete on tables to authenticated;
