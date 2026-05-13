-- Phase A — local AI assistant (RAG over neuralib).
-- pgvector for card embeddings, hybrid search RPC, chat persistence.

create extension if not exists vector with schema extensions;

-- ============================================================================
-- CARD EMBEDDINGS — 1:1 with cards, regenerated only when content_plain changes
-- ============================================================================

create table neuralib.card_embeddings (
  card_id     uuid primary key references neuralib.cards(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  embedding   extensions.vector(768) not null,
  model       text not null default 'nomic-embed-text',
  source_hash text not null,
  updated_at  timestamptz not null default now()
);

create index card_embeddings_owner_idx on neuralib.card_embeddings (owner_id);
create index card_embeddings_vec_idx
  on neuralib.card_embeddings
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

alter table neuralib.card_embeddings enable row level security;
create policy "card_embeddings: owner only" on neuralib.card_embeddings
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ============================================================================
-- HYBRID SEARCH RPC — semantic distance + tsvector rank
-- ============================================================================

create or replace function neuralib.search_cards_hybrid(
  q text,
  q_embedding extensions.vector(768),
  lim int default 8
)
returns table (
  id uuid,
  title text,
  summary text,
  subject_id uuid,
  rank real,
  snippet text
)
language sql
stable
security invoker
set search_path = neuralib, extensions, pg_temp
as $rpc$
  with semantic as (
    select c.id, 1 - (e.embedding <=> q_embedding) as sim
    from neuralib.cards c
    join neuralib.card_embeddings e on e.card_id = c.id
    where c.owner_id = (select auth.uid())
    order by e.embedding <=> q_embedding
    limit 30
  ),
  keyword as (
    select c.id,
           ts_rank(c.search_vector, websearch_to_tsquery('english', q)) as kw
    from neuralib.cards c
    where c.owner_id = (select auth.uid())
      and c.search_vector @@ websearch_to_tsquery('english', q)
    limit 30
  )
  select
    c.id,
    c.title,
    c.summary,
    c.subject_id,
    (coalesce(s.sim, 0) * 0.7 + coalesce(k.kw, 0) * 0.3)::real as rank,
    ts_headline(
      'english',
      c.content_plain,
      websearch_to_tsquery('english', q),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=24, MinWords=6'
    ) as snippet
  from neuralib.cards c
  left join semantic s on s.id = c.id
  left join keyword  k on k.id = c.id
  where c.owner_id = (select auth.uid())
    and (s.sim is not null or k.kw is not null)
  order by rank desc
  limit lim;
$rpc$;

grant execute on function neuralib.search_cards_hybrid(text, extensions.vector, int)
  to authenticated;

-- ============================================================================
-- CHAT THREADS + MESSAGES — persisted assistant conversations
-- ============================================================================

create table neuralib.assistant_threads (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text,
  model      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assistant_threads_owner_updated_idx
  on neuralib.assistant_threads (owner_id, updated_at desc);

create table neuralib.assistant_messages (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references neuralib.assistant_threads(id) on delete cascade,
  position     int  not null,
  role         text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content      text not null default '',
  tool_calls   jsonb,
  tool_call_id text,
  created_at   timestamptz not null default now(),
  unique (thread_id, position)
);
create index assistant_messages_thread_pos_idx
  on neuralib.assistant_messages (thread_id, position);

alter table neuralib.assistant_threads  enable row level security;
alter table neuralib.assistant_messages enable row level security;

create policy "threads: owner only" on neuralib.assistant_threads
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "messages: via parent thread" on neuralib.assistant_messages
  for all
  using (exists (
    select 1 from neuralib.assistant_threads t
    where t.id = thread_id and t.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from neuralib.assistant_threads t
    where t.id = thread_id and t.owner_id = (select auth.uid())
  ));

create trigger trg_assistant_threads_updated_at
before update on neuralib.assistant_threads
for each row execute function neuralib.touch_updated_at();

-- Existing role grants in 0001 cover the new tables via ALTER DEFAULT PRIVILEGES,
-- but be explicit for safety.
grant select, insert, update, delete on neuralib.card_embeddings   to authenticated;
grant select, insert, update, delete on neuralib.assistant_threads to authenticated;
grant select, insert, update, delete on neuralib.assistant_messages to authenticated;
