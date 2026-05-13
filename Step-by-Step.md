# Neurolib — Step-by-Step Setup

A complete recipe for taking this repo from `git clone` to a working personal knowledge library on your own machine. Neurolib is **single-user by design**: every clone runs against its own Supabase backend, so the steps below set up *your* backend, not someone else's.

Estimated time: **15–20 minutes** if you already have Node, pnpm, and a Supabase account; **45–60 minutes** from a clean machine.

---

## Table of contents

1. [What you're building](#1-what-youre-building)
2. [Prerequisites](#2-prerequisites)
3. [Clone and install](#3-clone-and-install)
4. [Create a Supabase project](#4-create-a-supabase-project)
5. [Apply the database schema](#5-apply-the-database-schema)
6. [Configure Supabase dashboard settings](#6-configure-supabase-dashboard-settings)
7. [Wire up environment variables](#7-wire-up-environment-variables)
8. [Run the dev server](#8-run-the-dev-server)
9. [Sign in and create your first card](#9-sign-in-and-create-your-first-card)
10. [Optional — AI assistant via Ollama](#10-optional--ai-assistant-via-ollama)
11. [Daily-use cheatsheet](#11-daily-use-cheatsheet)
12. [Deploying to AWS Amplify](#12-deploying-to-aws-amplify)
13. [Troubleshooting](#13-troubleshooting)
14. [Backing up your library](#14-backing-up-your-library)

---

## 1. What you're building

A personal knowledge library where:

- **Subjects** form a tree (e.g. `Algorithms → Graph Algorithms → PageRank`).
- Each **card** is a `.tex` file you edit in CodeMirror. Hit `⌘S` and Tectonic compiles it to a PDF rendered in the right pane.
- **Compositions** let you drag cards into a sequence and compile the bundle as a single textbook PDF.
- Optional **AI assistant** (runs locally via Ollama) can search your cards, read them, and propose edits — all writes require explicit approval.

There is no shared cloud — your Supabase project holds everything, and only you can sign into it.

---

## 2. Prerequisites

### Required

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | <https://nodejs.org> or via `nvm install 20` |
| pnpm | latest | `npm i -g pnpm` |
| Tectonic | ≥ 0.15 | see below |
| A Supabase account | — | <https://supabase.com> (free tier is plenty) |

Verify:
```bash
node -v        # v20.x or newer
pnpm -v        # 9.x+
```

### Installing Tectonic

Tectonic is a self-bootstrapping LaTeX engine. One binary, no TeX Live install.

**Linux / macOS:**
```bash
curl --proto "=https" --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh
sudo mv tectonic /usr/local/bin/
tectonic --version
```

**Windows:** download a release binary from <https://github.com/tectonic-typesetting/tectonic/releases> and put it on your PATH.

On first compile, Tectonic downloads ~150 MB of TeX Live bundle and caches it forever after.

### Optional — Ollama (for the AI assistant)

If you don't plan to use the AI assistant, skip this. The rest of the app works without it.

```bash
# Install Ollama from https://ollama.com, then pull the two models:
ollama pull gemma3:27b           # chat model (~17 GB). Substitute any chat model and set OLLAMA_CHAT_MODEL.
ollama pull nomic-embed-text     # 768-dim embedding model. Required dimension; don't substitute.
```

The chat model can be any Ollama-served model that supports tool calls. The embedding model **must** output 768-dim vectors because the `card_embeddings.embedding` column is `vector(768)`. `nomic-embed-text` is the right choice.

---

## 3. Clone and install

```bash
git clone https://github.com/<you>/neurolib.git
cd neurolib
pnpm install
```

Installing pulls Next.js 15, Tailwind v4, CodeMirror, the Supabase SSR client, the Vercel AI SDK, and everything else. ~2 min on a fresh machine.

---

## 4. Create a Supabase project

1. Go to <https://supabase.com/dashboard> and click **New project**.
2. Pick any organization (free tier is fine).
3. **Name**: anything, e.g. `neurolib`.
4. **Database password**: generate one and stash it in your password manager — you'll only need it if you later use the Supabase CLI with `db reset` or direct `psql`.
5. **Region**: choose the one closest to you.
6. Click **Create new project** and wait ~2 minutes for provisioning.

When it's ready, open **Project Settings → API** and copy two values into a scratch buffer:

| Field | Where in the dashboard | Used for |
|---|---|---|
| **Project URL** | `https://<ref>.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable key** (also called `anon`) | starts with `sb_publishable_…` (newer projects) or `eyJ…` (older) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

The publishable key is **safe to expose in the browser** — Supabase's auth model is built around it, with RLS enforcing per-user data isolation. Never paste the **service-role** key into this app; Neurolib never needs it.

---

## 5. Apply the database schema

Four migrations live in `supabase/migrations/`. They create the `neuralib` schema with all tables, RLS policies, search RPCs, and the pgvector embeddings table.

### Option A — Supabase CLI (recommended)

Install the CLI: <https://supabase.com/docs/guides/local-development/cli/getting-started>

```bash
supabase login
supabase link --project-ref <your-ref>     # the part before .supabase.co in your project URL
supabase db push
```

You'll see four migrations apply in order: `0001_init` → `0002_expose_neuralib_schema` → `0003_storage_upsert_policies` → `0004_ai_assistant`.

### Option B — SQL Editor (no CLI)

1. Open **SQL Editor** in the Supabase dashboard.
2. For each file in `supabase/migrations/` in numeric order, paste the contents into a new query and click **Run**.

Apply them in order — `0001` first, then `0002`, `0003`, `0004`. Each is idempotent enough to re-run, but cleaner to run once each.

### What the migrations create

- **Schema `neuralib`** with tables: `subjects`, `cards`, `card_versions`, `tags`, `card_tags`, `card_links`, `compositions`, `composition_entries`, `assets`, `exports`, `assistant_threads`, `assistant_messages`, `card_embeddings`.
- **Extensions**: `pg_trgm` (fuzzy search) and `pgvector` (semantic search) in the `extensions` schema.
- **RLS policies** on every table — `auth.uid() = owner_id` (or via the parent row's owner).
- **PostgREST exposure** of the `neuralib` schema by setting `pgrst.db_schemas` on the auth roles.
- **Search RPCs** (`search_cards`, `search_cards_hybrid`) used by the command palette and the AI assistant.

---

## 6. Configure Supabase dashboard settings

Two manual steps the migrations can't do for you.

### 6.1 Expose `neuralib` to the API

Even though migration `0002` sets the role-level GUC, the Supabase dashboard maintains its own override. Confirm both agree:

**Project Settings → API → Exposed schemas** — make sure the list reads `public, graphql_public, neuralib`. Add `neuralib` if it isn't there. Click **Save**.

Without this, every supabase-js call will fail with `PGRST106: Invalid schema: neuralib`.

### 6.2 Create the two storage buckets

The RLS policies for storage live in the migrations, but the buckets themselves are dashboard-managed.

**Storage → New bucket**, twice:

| Bucket name | Public? | Purpose |
|---|---|---|
| `neuralib-exports` | **Private** | Compiled card and composition PDFs |
| `neuralib-assets`  | **Private** | Future asset uploads (images, etc.) |

Bucket names must match exactly — they're hard-coded in the app.

### 6.3 Lock down auth (single-user safety)

**Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/**`

If you'll also deploy to a hosted URL (e.g. Amplify), add that wildcard too (e.g. `https://main.<id>.amplifyapp.com/**`).

**Authentication → Providers → Email**:
- Leave **Allow new users to sign up** ON for now — you need it on the first time you send yourself a magic link.
- After your first successful sign-in, come back and **turn it OFF**. This prevents strangers who find your repo from creating accounts on your project.

---

## 7. Wire up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your publishable key>

# Only set these if you're using the AI assistant and want to override defaults:
# OLLAMA_BASE_URL=http://127.0.0.1:11434
# OLLAMA_CHAT_MODEL=gemma3:27b
# OLLAMA_EMBED_MODEL=nomic-embed-text
```

`.env.local` is gitignored — it's local-only. Never commit it.

---

## 8. Run the dev server

```bash
pnpm dev
```

The Turbopack dev server starts on <http://localhost:3000>. First boot takes a few seconds; subsequent edits hot-reload.

Open the URL in your browser. You should land on `/login`.

---

## 9. Sign in and create your first card

1. Enter your email and click **Send magic link**.
2. Check your inbox (Supabase free tier sends auth emails from `noreply@mail.app.supabase.io`). The link will look like `http://localhost:3000/auth/callback?code=…`.
3. Clicking it lands you on `/`. You're authenticated for the next session.
4. **Go back to Supabase → Authentication → Providers → Email and disable signups now** (see 6.3).
5. In the sidebar, click `+` to create a top-level subject — e.g. **Algorithms**.
6. Inside that subject, click `+` again for **Graph Algorithms**, then `+` for a card named **PageRank**.
7. The card opens in CodeMirror. Paste in some LaTeX:
   ```latex
   PageRank ranks nodes by the stationary distribution of a random walk on the
   web graph with damping factor $d$:
   \[
     PR(u) = \frac{1-d}{N} + d \sum_{v \in B_u} \frac{PR(v)}{L(v)}.
   \]
   ```
8. Hit `⌘S` (macOS) or `Ctrl+S` (Linux/Windows). Tectonic compiles and the PDF appears in the right pane.

If anything errors here, jump to [Troubleshooting](#13-troubleshooting).

---

## 10. Optional — AI assistant via Ollama

Skip if you don't want the assistant.

### 10.1 Start Ollama

```bash
ollama serve     # or rely on the systemd service if your installer set one up
```

Verify it's listening:
```bash
curl http://127.0.0.1:11434/api/tags
```

Should return JSON listing your installed models, including `gemma3:27b` and `nomic-embed-text`.

### 10.2 Verify health

With `pnpm dev` running and you signed in, hit:
```
http://localhost:3000/api/assistant/health
```
You're looking for `{ ok: true, ollama: { reachable: true, chatModel.present: true, embedModel.present: true }, embeddings: { tableReady: true } }`. Any `false` comes with a `hint` field telling you what to fix.

### 10.3 Backfill embeddings

The assistant uses semantic search over `card_embeddings`. New/edited cards are embedded automatically, but anything you created **before** wiring up Ollama needs a one-time backfill:

```bash
# while logged in, in another terminal:
curl -X POST http://localhost:3000/api/assistant/backfill \
  -b "$(grep -oE 'sb-[^=]+=[^;]+' ~/.config/google-chrome/Default/Cookies)"
```

…or simpler: open `/assistant` in the browser, and click the **Backfill** button if one's visible. The endpoint reports how many cards were updated.

### 10.4 Chat

Open `/assistant`. The model has four read tools — `list_subjects`, `search_cards`, `read_card`, `read_links` — and five propose-only write tools — `create_subject`, `create_card`, `update_card`, `add_tag`, `link_cards`. Any write returns a `pending_approval` card with **Approve / Cancel** buttons. The model **cannot** write directly.

---

## 11. Daily-use cheatsheet

| Action | How |
|---|---|
| Open command palette | `⌘K` / `Ctrl+K` |
| Find a card | `⌘K` → start typing (fuzzy title + content match) |
| New card | Sidebar `+` on a subject, or `⌘K` → "New card" |
| Save + compile current card | `⌘S` / `Ctrl+S` in the editor |
| Reorder cards in a subject | Drag in the sidebar (dnd-kit) |
| Build a textbook | `/compose` → **New composition** → drag cards in → **Compile** |
| Tag a card | Inline in the card header — type a tag, press Enter |
| Add a See-also link | Right-pane **Links** panel → search a card → pick a kind |
| Export everything | `GET http://localhost:3000/api/export` while signed in — returns one JSON file |
| Sign out | Sidebar profile menu or `POST /auth/signout` |

PDF compiles are cached by `sha256(content + format + preamble + cover)`. Saving an unchanged card returns the previous PDF instantly.

---

## 12. Deploying to AWS Amplify

You don't need this to use Neurolib locally. Skip unless you want a hosted version.

1. Push the repo to GitHub.
2. AWS Console → **Amplify → Create new app → Host web app** → GitHub → pick the repo and the `main` branch.
3. Amplify auto-detects Next.js SSR and reads `amplify.yml`. Accept the defaults.
4. **Environment variables**: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the same values as your local `.env.local`.
5. **Save and deploy** — first build takes ~5–8 minutes.
6. Copy the deploy URL (e.g. `https://main.d1a2b3c4xyz.amplifyapp.com`) and add it to Supabase → **Authentication → URL Configuration → Redirect URLs** as `https://main.d1a2b3c4xyz.amplifyapp.com/**`. Update **Site URL** to the same.

**A serious caveat for the hosted version:** the `/api/compile*` routes spawn `tectonic`. Amplify's Next.js SSR Lambda doesn't have Tectonic installed, so PDF compilation **won't work** in the deployed environment without packaging Tectonic into a Lambda layer or a separate container (the `amplify/functions/compile-tex/` scaffold exists for this but isn't deployed by default). Read, write, search, and chat all work — just PDF compile is local-only for now.

---

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `PGRST106: Invalid schema: neuralib` on every query | The `neuralib` schema isn't exposed | Dashboard → Settings → API → Exposed schemas → add `neuralib` |
| "Sign-in link is invalid or has expired" on the callback | Redirect allowlist doesn't include your origin | Auth → URL Configuration → add `http://localhost:3000/**` |
| `⌘S` returns `{ reason: "missing_tectonic" }` | `tectonic` isn't on the PATH of the shell that ran `pnpm dev` | `which tectonic` in that shell; reinstall to a path that's on `$PATH` |
| Compile fails with `storage … bucket not found` | Forgot to create `neuralib-exports` | Storage → New bucket → name it exactly `neuralib-exports`, private |
| Card saves but no PDF shows | Browser blocked the signed URL or the bucket is misconfigured | Open the Network tab, click the failed `/api/compile` request, read the response |
| AI assistant: `ollama.reachable: false` | Daemon not running | `ollama serve`, then re-check `/api/assistant/health` |
| AI assistant: `chatModel.present: false` | The configured model isn't pulled | `ollama pull <model name>`; or set `OLLAMA_CHAT_MODEL` to a model you do have |
| AI assistant: `embeddings.tableReady: false` | Migration `0004` didn't run | `supabase db push` (or run `0004_ai_assistant.sql` in the SQL editor) |
| `pnpm dev` shows `EADDRINUSE :3000` | Another process is on port 3000 | `lsof -i :3000` and kill the holder, or `pnpm dev -- -p 3001` |
| Magic-link email never arrives | Supabase free tier sometimes ratelimits, or it's in spam | Check Authentication → Logs in the dashboard; try a different inbox |

---

## 14. Backing up your library

Everything is in one Postgres project, but if you want the on-disk feel:

```bash
# While signed in, with the dev server running:
curl -sb "<session-cookie>" http://localhost:3000/api/export \
  > neurolib-$(date +%Y-%m-%d).json
```

The export contains every subject, card (with full LaTeX source), version, tag, link, composition, and entry. Drop it in a private git repo and commit on a cron for a poor-person's time machine.

Supabase also takes daily Postgres backups on the free tier — restorable from the dashboard (Database → Backups).

---

That's everything. Once you're running, this doc shouldn't matter to you anymore — `⌘K` and `⌘S` are basically the whole interface.
