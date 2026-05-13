# Neurolib

A personal knowledge library. Hierarchical subjects → LaTeX cards → composable textbook PDFs, with a light, energy-keeping UI ("Daylight Study"). Single-user; designed for studying and reference, not collaboration.

---

## TL;DR

- `pnpm install` → `pnpm dev` → http://localhost:3000.
- Sign in with a magic link, then start creating subjects in the sidebar (`+`).
- Every card is a `.tex` file in the database; you edit it in CodeMirror, hit `⌘S` to save + compile a PDF locally via Tectonic, view in the right pane.
- Stitch cards into a textbook via `/compose/<id>` — drag-to-reorder + label-namespacing concat.
- `⌘K` opens search across every card.
- Sidebar → *Export library (JSON)* dumps your whole library to disk for backup.

---

## Status

Built through **Phase 6** (the full vision is shipped). Subjects, cards, LaTeX editor with stex highlighting, autosave + version snapshots, Tectonic compile pipeline, content-hash PDF caching, ⌘K search palette, `/search` page with debug view, compositions with drag-to-reorder + cross-card label namespacing, tags, card links + backlinks, JSON library export, and `.tex` file import.

Known follow-ups are listed at the bottom.

---

## Features

### Knowledge graph
- **Hierarchical subjects** — arbitrary-depth tree; sidebar tree with create / rename / delete (drag-reorder is a deferred polish).
- **Cards** — leaf units of knowledge, each a LaTeX source file (`latex_fragment` wrapped at compile time, or `latex_doc` standalone). Slug-based URLs scoped under the subject.
- **Tags** — cross-cutting labels, deterministic palette colour from a name hash, autocomplete from existing tags.
- **Card links** — typed concept relationships (`related`, `depends_on`, `extends`, `cites`). Both outgoing and incoming (backlinks) shown in a "See also" panel under the editor.

### Editor
- **CodeMirror 6** with the `stex` legacy mode, custom Daylight Study theme (warm cream background, coral cursor, sunshine highlight on the active line, sky selection-match).
- **Autosave** debounced at 1.5 s. **Version snapshots** triggered when the content delta is large (≥ 200 chars) OR ≥ 5 minutes since the last snapshot — keeps the version table from exploding while still recording rough checkpoints.
- **`⌘S` / `Ctrl-S`** flushes the pending save AND triggers a compile.

### Compile pipeline
- **Local Tectonic** — Next.js API route shells out via `child_process.spawn`. Handles missing-binary case with an inline install hint. 30-second timeout. First-line `! …` error extraction for friendly toasts.
- **Bundled preamble** — `templates/preamble.tex` curated for graph algorithms / network science (TikZ, pgfplots, tikz-cd, ams\*, hyperref, cleveref, graph-drawing libs).
- **Content-hash caching** — `sha256(content + format + preamble)` keys the `neuralib.exports` row. Cache hits return a signed Storage URL in milliseconds; misses run Tectonic, upload to `neuralib-exports`, then return the same URL.
- **PDF preview** — iframe-based viewer (browsers handle zoom/search/print natively). Four states: empty / compiling (with stale-overlay over the previous PDF) / ready / error (with collapsible Tectonic log).
- **Amplify Function scaffold** in `amplify/functions/compile-tex/` — Dockerfile + handler ready to deploy as a Lambda container image with Tectonic + warmed cache. Not deployed; switch to it by setting `COMPILE_FUNCTION_URL` once the image is pushed.

### Compositions ("textbooks")
- Ordered list of card entries plus optional headings / page breaks / raw passthrough.
- **Drag-to-reorder** with `@dnd-kit` (two-pass DB update to dodge the `(composition_id, position)` unique constraint).
- **Label namespacing** — at concat time, every `\label{X}` becomes `\label{<slug>:X}`, and intra-card refs (`\ref/\eqref/\cref/\Cref/\autoref/\pageref/\nameref/\vref{X}`) auto-rewrite when the target is a local label. Cross-card refs use explicit `\ref{<other-slug>:X}` syntax — no auto-resolve, so links don't silently break when you reorder.
- **Master template** at `templates/book.tex` — `\documentclass{book}` with TOC, frontmatter / mainmatter, per-card `\chapter{}` wrapping. Title/author/date markers replaced at compile time.
- **Cache-through** in `neuralib.exports` keyed by `(composition_id, content_hash)` — same hashing pattern as cards.

### Search
- **`⌘K` palette** — `cmdk`-based dialog, debounced 150 ms, race-safe via a query-id ref. Results show subject breadcrumb + title + `<mark>`-highlighted snippet from `ts_headline`.
- **`/search` page** — full results with rank exposed. `?debug=1` adds a collapsible panel showing each card's `content_plain` (the stripped-TeX text that FTS actually sees) — invaluable when a card "doesn't show up" and you need to understand why.
- **Trigram fallback** — typos like "pagernk" still surface PageRank, courtesy of `pg_trgm` on title + summary.

### Library management
- **`.tex` import** — file picker on subject pages, reads the file, infers title from `\title{}` / `\chapter{}` / `\section{}` (falls back to filename), detects `\documentclass` to choose `latex_doc` vs `latex_fragment`, creates the card and lands you in the editor.
- **JSON export** — `GET /api/export` streams a `neurolib-YYYY-MM-DD.json` of every owned row across all neuralib tables. RLS scopes it; no extra filtering. Sidebar link pinned to the bottom.

---

## Architecture

```
┌──────────────────────────┐    ┌───────────────────────────┐
│ Browser                  │    │ Next.js (Amplify Hosting) │
│ - CM6 stex editor        │◄──►│ - App Router (SSR)        │
│ - PDF.js iframe preview  │    │ - /api/compile, /api/      │
│ - cmdk ⌘K palette        │    │   compile/composition,    │
└────────┬─────────────────┘    │   /api/export             │
         │ Supabase JS          └──────────┬────────────────┘
         ▼                                 │ child_process
┌──────────────────────────┐               ▼
│ Supabase                 │    ┌───────────────────────────┐
│ - Postgres `neuralib`    │    │ Local Tectonic            │
│   (subjects, cards,      │    │ - shelled-out per request │
│    versions, tags,       │    │ - 30s timeout             │
│    links, compositions,  │    │ - bundled preamble at     │
│    exports)              │    │   templates/preamble.tex  │
│ - Storage:               │    │                           │
│   neuralib-assets        │    │ (Lambda container variant │
│   neuralib-exports       │    │  scaffolded but unwired)  │
│ - Auth (magic link)      │    │                           │
└──────────────────────────┘    └───────────────────────────┘
```

- **Reads & writes** flow Browser ↔ Supabase under RLS — no business logic in the Next.js layer for CRUD; server actions just enforce auth and call supabase-js.
- **Compile** is the only request that needs server compute: Browser → `/api/compile{,/composition}` → spawned `tectonic` → Storage upload → signed URL.
- **Sessions** are refreshed on every request by `src/middleware.ts` via `@supabase/ssr`'s SSR cookies.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** + TypeScript strict | Server components for cheap initial loads; route handlers for the compile API |
| Styling | **Tailwind v4** (CSS-first `@theme`) + custom Daylight Study palette | Light theme by default; no design system overhead |
| Editor | **CodeMirror 6** + `@codemirror/legacy-modes/mode/stex` via `@uiw/react-codemirror` | Best-in-class for technical content; small custom theme keeps the palette consistent |
| State (server) | **TanStack Query** | Installed for future caching layers; current code uses server actions + `revalidatePath` |
| State (UI) | **Zustand** | One small store: the ⌘K palette open/close |
| Search palette | **cmdk** (Radix-style) | Keyboard nav + filtering for free |
| Drag & drop | **@dnd-kit** core + sortable | Composition reordering |
| Toasts | **sonner** | Non-blocking feedback for autosave / compile / errors |
| Backend | **Supabase** | Postgres + Auth + Storage all wired through `@supabase/ssr@0.10` |
| Schema | `neuralib` (Postgres 17 on Supabase project `Personal`) | Per-row owner_id + RLS; `pg_trgm` for fuzzy search |
| Compile | **Tectonic** (local) | Self-bootstrapping LaTeX, single binary, deterministic |
| PDF viewer | Native browser via `<iframe>` | Zoom/search/print/scroll already solved |
| Hosting | **AWS Amplify Hosting** for the Next.js app; Tectonic local-only for now | See "Open questions" below for the unresolved cloud-compile decision |

---

## Project structure

```
Neurolib/
├── README.md                            ← this file
├── package.json
├── next.config.ts                       ← Amplify SSR-compatible Next config
├── tsconfig.json                        ← @/ → src, @db/ → supabase
├── tailwind.config.ts (none — v4 CSS-first)
├── postcss.config.mjs
├── amplify.yml                          ← Amplify Hosting build spec
├── amplify/
│   ├── backend.ts                       ← defineBackend({}) — empty in v1
│   ├── package.json, tsconfig.json
│   └── functions/compile-tex/           ← Lambda container scaffold (deferred deploy)
│       ├── handler.ts
│       ├── Dockerfile                   ← bundles Tectonic + warmed preamble
│       └── resource.ts
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql                ← full neuralib schema + RLS + RPC
│   │   ├── 0002_expose_neuralib_schema.sql ← PostgREST exposed-schemas GUC
│   │   └── (storage buckets applied via MCP, see Database below)
│   └── types.ts                         ← generated from neuralib schema
├── templates/
│   ├── preamble.tex                     ← bundled curated preamble
│   └── book.tex                         ← composition master template
└── src/
    ├── middleware.ts                    ← refreshes Supabase session, gates routes
    ├── app/
    │   ├── layout.tsx                   ← root <html><body> + globals.css
    │   ├── globals.css                  ← Tailwind + tokens + base styles
    │   ├── login/                       ← magic-link form + server action
    │   ├── auth/
    │   │   ├── callback/route.ts        ← exchanges OTP code for session
    │   │   └── signout/route.ts
    │   ├── api/
    │   │   ├── compile/route.ts         ← single-card LaTeX → PDF
    │   │   ├── compile/composition/route.ts
    │   │   └── export/route.ts          ← whole-library JSON dump
    │   └── (app)/                       ← authed route group with sidebar shell
    │       ├── layout.tsx               ← fetches subjects + compositions, mounts ⌘K palette
    │       ├── page.tsx                 ← dashboard
    │       ├── s/[[...path]]/page.tsx   ← subject browser (cards + sub-subjects)
    │       ├── c/[cardId]/edit/page.tsx ← editor (CardWorkspace)
    │       ├── compose/page.tsx         ← compositions list
    │       ├── compose/[compositionId]/page.tsx ← builder
    │       └── search/page.tsx          ← full search page (?debug=1)
    ├── components/
    │   ├── shell/Sidebar.tsx
    │   ├── search/CommandPalette.tsx
    │   ├── subjects/SubjectTree.tsx
    │   ├── cards/CardListItem.tsx
    │   ├── cards/NewCardButton.tsx
    │   ├── cards/ImportTexButton.tsx
    │   ├── cards/CardTagBar.tsx
    │   ├── cards/CardLinksPanel.tsx
    │   ├── compose/CompositionListItem.tsx
    │   ├── compose/NewCompositionButton.tsx
    │   ├── compose/CompositionBuilder.tsx
    │   ├── editor/CardEditor.tsx        ← CM6 + Daylight Study theme
    │   ├── editor/CardWorkspace.tsx     ← bridges editor ↔ preview state
    │   └── preview/PdfPreview.tsx
    ├── lib/
    │   ├── supabase/{client,server,middleware,types}.ts
    │   ├── db/                          ← server-only query helpers
    │   │   ├── subjects.ts
    │   │   ├── cards.ts
    │   │   ├── compositions.ts
    │   │   ├── tags.ts
    │   │   ├── links.ts
    │   │   └── search.ts
    │   ├── actions/                     ← server actions
    │   │   ├── subjects.ts, cards.ts, compositions.ts, tags.ts, links.ts, search.ts
    │   ├── compile/
    │   │   ├── local.ts                 ← Tectonic shell-out
    │   │   └── cache.ts                 ← hash + preamble loader
    │   ├── compose/
    │   │   └── concat.ts                ← label namespacer + master template assembly
    │   ├── slug.ts
    │   └── utils.ts                     ← cn() for class merging
    ├── stores/
    │   └── palette.ts                   ← Zustand store for the ⌘K palette
    └── styles/
        └── tokens.css                   ← Daylight Study palette as @theme
```

---

## Prerequisites

- **Node ≥ 20** (managed via nvm: `nvm use --lts`).
- **pnpm** — enable via `corepack enable pnpm`.
- **Tectonic** (for the compile pipeline). Linux/macOS quick install:
  ```bash
  curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh
  sudo mv ./tectonic /usr/local/bin/
  ```
  Verify: `tectonic --version`. If it's not on PATH, the editor's preview pane will show a friendly install hint instead of crashing.
- **Supabase CLI** — only needed when you regenerate types: `brew install supabase/tap/supabase` (or use `npx supabase` ad-hoc; that works without a global install).
- **AWS Amplify CLI** — only needed if/when you decide to deploy: `npm i -g @aws-amplify/backend-cli` and `aws configure`.

---

## Setup

```bash
git clone <this-repo>            # if you haven't already
cd Neurolib
corepack enable pnpm
pnpm install
```

The repo ships `.env.local` with the Personal Supabase project's URL and publishable key already set, so no secret values to paste. If you point this at a different Supabase project later, `cp .env.example .env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### One-time Supabase config

Two settings need to be flipped before sign-in works end-to-end on a fresh project:

1. **Magic-link redirect allowlist.** Supabase rejects callback URLs not on the allowlist.
   - Dashboard → *Authentication* → *URL Configuration* → add `http://localhost:3000/**` and `http://localhost:3003/**` (Next picks 3003 if 3000 is busy) plus your eventual deployed origin.

2. **PostgREST exposed schemas.** Default is `public, graphql_public`; we need `neuralib` too. The migration `supabase/migrations/0002_expose_neuralib_schema.sql` does this via role-level GUCs and a `NOTIFY pgrst, 'reload config'`. If you ever see `PGRST106 — Invalid schema: neuralib`, the GUC reverted — re-run that migration.

---

## Daily commands

```bash
pnpm dev                    # Next.js dev server with Turbopack (http://localhost:3000)
pnpm build                  # production build
pnpm start                  # serve the production build
pnpm typecheck              # tsc --noEmit, strict
pnpm lint                   # next lint
pnpm typegen                # regenerate supabase/types.ts from the live schema
pnpm amplify:sandbox        # spin up an isolated Amplify backend (requires AWS auth)
```

If you change the schema, the order is: write a migration → apply it via the Supabase MCP or `supabase db push` → `pnpm typegen` to refresh `supabase/types.ts`.

---

## Database

Schema name is **`neuralib`** (the product is `Neurolib`; spelling decided early — keep them distinct). Tables under it:

| Table | Purpose |
|---|---|
| `subjects` | Self-referencing hierarchy. Per-owner unique `(parent_id, slug)`. |
| `cards` | The atomic LaTeX file. `format` ∈ {`latex_fragment`, `latex_doc`}, `status` ∈ {`draft`, `published`, `archived`}. `content_plain` is the stripped-TeX projection used for FTS. |
| `card_versions` | Append-only history. Snapshot heuristic: ≥ 5 min since last OR ≥ 200-char delta. |
| `tags`, `card_tags` | Cross-cutting labels. Many-to-many. |
| `assets` | Image / diagram references; objects live in the `neuralib-assets` Storage bucket. |
| `card_links` | Typed concept graph. Self-references blocked by check constraint; uniqueness on (source, target, kind). |
| `compositions` | A book / cheatsheet built from cards. Per-owner unique slug. |
| `composition_entries` | Ordered (composition_id, position). Kinds: `card | heading | page_break | raw`. |
| `exports` | PDF cache keyed by `(card_id|composition_id, content_hash)`. Storage at `neuralib-exports/<owner>/<hash>.pdf`. |

**RLS** is enabled on every table; every policy is `owner_id = (select auth.uid())` (or "via the parent's owner" for junction tables).

**Search** runs through `neuralib.search_cards(q, lim)` — `ts_rank(search_vector, websearch_to_tsquery(...)) + similarity(title, q) * 0.3`, with `c.title % q OR c.summary % q` as a trigram fallback. The `search_vector` is a generated tsvector over `(title weight A, summary B, content_plain C)`, maintained by the `cards_refresh_search_vector` trigger which also keeps `content_plain` in sync via `neuralib.strip_tex(content)`.

**Storage buckets** (created via the MCP migration during Phase 2):

| Bucket | Public? | Purpose |
|---|---|---|
| `neuralib-assets` | private | drag-dropped images + future diagram uploads |
| `neuralib-exports` | private | cached compiled PDFs |

Both have RLS policies that scope objects to the owner's uid by checking `(storage.foldername(name))[1] = (select auth.uid()::text)`.

---

## The compile pipeline

```
   Editor                                    Preview
     │                                          ▲
     │ ⌘S                                       │
     ▼                                          │
   POST /api/compile { cardId }                 │
     │                                          │
     ▼                                          │
   1. auth.getUser()                            │
   2. fetch card                                │
   3. hash = sha256(content + format + preamble)│
   4. exports row with this hash + status='ready'?
        │ yes ─→ signed URL ──────────────────  │
        │ no                                    │
   5. insert pending exports row                │
   6. compileLocally(content, format, preamble) │
        │ missing tectonic → friendly toast    ─┘
        │ compile error → log shown in panel   ─┘
        │ success                               │
   7. upload PDF to neuralib-exports/<uid>/<hash>.pdf
   8. update exports row → status='ready', storage_path
   9. createSignedUrl(path, 1h)                 │
     │                                          │
     └─→ signed URL ───────────────────────────►│
                                                ▼
                                            iframe src=<signed URL>
```

Compositions follow the same path through `/api/compile/composition`, except step 2 is "fetch composition + entries", and step 6 calls `assembleBook` first to produce a full LaTeX document (with the preamble inlined and label namespacing applied per card), then compiles in `latex_doc` mode (no preamble wrapping).

### Switching to cloud Tectonic

The Amplify Function scaffold at `amplify/functions/compile-tex/` is ready but not wired into `amplify/backend.ts` (would change `defineBackend({})` to include the function). To deploy it:

1. Build the container image from `amplify/functions/compile-tex/Dockerfile` (it bundles Tectonic + a warmed package cache against the bundled preamble).
2. Push to ECR, reference from `resource.ts` (see the comment in that file for the CDK override pattern).
3. `pnpm amplify:deploy`.
4. Set `COMPILE_FUNCTION_URL` in the Next.js env to the function URL.
5. Update `src/app/api/compile/route.ts` to forward to the Lambda when that env is set (the route is currently hard-coded to `compileLocally`; this swap is intentionally a TODO).

---

## UI conventions

- **Daylight Study palette** lives in `src/styles/tokens.css` as Tailwind v4 `@theme` variables. Use them as utilities (`bg-cream-1`, `text-coral`) or via the v4 arbitrary-CSS-variable syntax (`text-(--color-coral)`).
- **Hard rules:** body text always uses `--color-ink` (`#1f2933`) on a surface ≥ `--color-cream-2` (`#fffdf7`). Never put text directly on `--color-sunshine` (yellow) — it's a highlight background only.
- **Sidebar** is the navigation hub: subject tree, compositions list, search button, sign-out, and the export link pinned at the bottom.
- **`⌘K` / `Ctrl-K`** is wired globally via the Zustand palette store; trigger from anywhere in an authed page.

---

## Routes

| Path | What it does |
|---|---|
| `/login` | Magic-link form. Server action calls `supabase.auth.signInWithOtp`. |
| `/auth/callback` | Exchanges the OTP `code` query param for a session, redirects to `next` or `/`. |
| `/auth/signout` | POST endpoint; clears the session and bounces to `/login`. |
| `/` | Welcome dashboard (or "create your first subject" empty state). |
| `/s` | All-subjects index. |
| `/s/<slug>/<sub>/...` | Subject browser — sub-subjects + card list + import button + new card button. |
| `/c/<id>/edit` | Editor + PDF preview + tag bar + see-also panel. |
| `/compose` | Composition list. |
| `/compose/<id>` | Builder UI — card picker + drag-to-reorder timeline + compile button. |
| `/search` | Full search results (with `?debug=1` for the stripped-TeX panel). |
| `/api/compile` | POST `{ cardId }` → `{ pdfUrl, cached, log? }`. |
| `/api/compile/composition` | POST `{ compositionId }` → `{ pdfUrl, cached, cardCount, warnings? }`. |
| `/api/export` | GET → JSON download of every owned row. |

Everything except `/login` and `/auth/*` is gated by `src/middleware.ts`.

---

## Backups

Two layers, pick whichever fits the context:

- **Library JSON** — sidebar → *Export library (JSON)* → `neurolib-YYYY-MM-DD.json`. Includes every subject, card, version, tag, link, composition, entry. Round-tripping it back into Postgres is a manual SQL job for now.
- **Supabase Postgres backups** — automatic on Supabase's hosted plan (Dashboard → Database → Backups).

For the on-disk-source-of-truth feel, run *Export library (JSON)* on a cron and check the file into a private Git repo.

---

## Open questions / known follow-ups

These were intentionally deferred from the build phases — pick them up as needed.

1. **"Render everything locally" vs Amplify hosting** — said the former earlier in planning, then chose Amplify. The current code is hosted-anywhere + local Tectonic. If the cloud-compile path is needed for "render PDFs while away from my laptop", deploy the Amplify Function scaffold (above).
2. **Multi-file `.tex` import** — single-file is in. Folder import (derive subjects from directory structure) hasn't been built.
3. **More keybindings** — only `⌘K` and `⌘S` are wired. Common adds: `⌘N` for new card in current subject, `?` for a shortcut help overlay, `g` + letter for navigation.
4. **Drag-reorder for subjects** — schema already has `position`; the UI uses `prompt`/`confirm` instead of dnd to keep Phase 2 small.
5. **Asset drag-and-drop into the editor** — `neuralib-assets` bucket exists with RLS; the editor doesn't yet upload + insert `\includegraphics{...}` on drop.
6. **Live preview** — currently compile-on-save (1-3 s). Hybrid (KaTeX for math + TikZJax for `tikzpicture` blocks + debounced Tectonic for the "true PDF" tab) is the recommended Phase 6.5 if the round-trip starts feeling slow.
7. **Read-only card view at `/c/<id>`** — only `/c/<id>/edit` exists today. A read-only route would be nice for sharing-by-link.
8. **Preamble editor** — the bundled preamble is treated as immutable today; the plan called for it to be user-editable with a "reset to default" button.
9. **Lint pass / CI** — `pnpm lint` runs but isn't gated on PRs (no CI configured).
10. **Empty-state seeded subjects** — could ship a `supabase/seed.sql` with starter subjects (Algorithms, Math, Network Science) for first run.

---

## Schema spelling note

Product is **Neurolib**; Postgres schema is **`neuralib`**. Both are intentional — don't normalize.

---

## License

Private / personal use. No license file shipped.
