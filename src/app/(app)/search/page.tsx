import { ChevronRight, FileText, Search } from "lucide-react";
import Link from "next/link";
import {
  searchCards,
  searchCardsWithDebug,
  type SearchHit,
} from "@/lib/db/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; debug?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const debug = params.debug === "1";

  const hits = q
    ? debug
      ? await searchCardsWithDebug(q)
      : await searchCards(q)
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-8 py-10">
      <header className="flex items-center gap-3">
        <Search className="size-6 text-(--color-coral)" aria-hidden />
        <h1 className="text-3xl font-semibold tracking-tight text-(--color-ink)">
          Search
        </h1>
        {debug ? (
          <span className="rounded-full bg-(--color-sky-soft) px-2 py-0.5 text-xs font-medium text-(--color-sky)">
            debug
          </span>
        ) : null}
      </header>

      <form
        action="/search"
        method="get"
        className="flex items-center gap-2 rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) px-3 py-2 shadow-(--shadow-soft) focus-within:border-(--color-coral)"
      >
        <Search className="size-4 text-(--color-ink-muted)" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search across every card…"
          autoFocus
          className="flex-1 bg-transparent py-1 text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)"
        />
        {debug ? <input type="hidden" name="debug" value="1" /> : null}
        <button
          type="submit"
          className="rounded-(--radius-sm) bg-(--color-coral) px-3 py-1.5 text-sm font-semibold text-white hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)]"
        >
          Search
        </button>
      </form>

      <div className="flex items-center justify-between text-sm text-(--color-ink-muted)">
        <span>
          {q
            ? hits.length === 0
              ? `No matches for "${q}".`
              : `${hits.length} result${hits.length === 1 ? "" : "s"} for "${q}".`
            : "Enter a query to begin."}
        </span>
        {q ? (
          <Link
            href={`/search?q=${encodeURIComponent(q)}${debug ? "" : "&debug=1"}`}
            className="text-(--color-sky) hover:underline"
          >
            {debug ? "Hide debug" : "Show debug"}
          </Link>
        ) : null}
      </div>

      {hits.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {hits.map((hit) => (
            <li key={hit.id}>
              <ResultCard hit={hit} debug={debug} />
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}

function ResultCard({
  hit,
  debug,
}: {
  hit: SearchHit | (SearchHit & { contentPlain: string });
  debug: boolean;
}) {
  return (
    <article className="rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) p-5 shadow-(--shadow-soft)">
      <Link
        href={`/c/${hit.id}/edit`}
        className="flex flex-col gap-1.5 text-(--color-ink) no-underline hover:text-(--color-coral)"
      >
        <Breadcrumb path={hit.subjectPath} />
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="size-4 text-(--color-ink-muted)" aria-hidden />
          {hit.title}
        </h2>
      </Link>

      {hit.snippet ? (
        <p
          className="mt-2 text-(--color-ink-muted)"
          // ts_headline returns its own <mark>...</mark>; trusted (single user)
          dangerouslySetInnerHTML={{ __html: hit.snippet }}
        />
      ) : hit.summary ? (
        <p className="mt-2 text-(--color-ink-muted)">{hit.summary}</p>
      ) : null}

      <p className="mt-2 font-mono text-xs text-(--color-ink-muted)">
        rank {hit.rank.toFixed(3)}
      </p>

      {debug && "contentPlain" in hit ? (
        <details className="mt-3 rounded-(--radius-sm) bg-(--color-cream-3) p-3">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
            content_plain (stripped TeX, this is what FTS sees)
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-(--color-ink-muted)">
            {hit.contentPlain || "(empty)"}
          </pre>
        </details>
      ) : null}
    </article>
  );
}

function Breadcrumb({ path }: { path: string[] }) {
  if (path.length === 0) {
    return <span className="text-xs text-(--color-ink-muted)">unfiled</span>;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-(--color-ink-muted)">
      {path.map((slug, i) => (
        <span key={`${i}-${slug}`} className="flex items-center gap-1">
          {i > 0 ? <ChevronRight className="size-3" aria-hidden /> : null}
          {slug}
        </span>
      ))}
    </span>
  );
}
