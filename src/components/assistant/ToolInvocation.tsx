"use client";

import {
  ChevronRight,
  FileText,
  FolderTree,
  Link2,
  Loader2,
  Search,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { ProposalCard } from "@/components/assistant/ProposalCard";
import type { Proposal } from "@/lib/ai/tools";

type ToolInvocationProps = {
  toolName: string;
  state: "partial-call" | "call" | "result";
  args?: Record<string, unknown>;
  result?: unknown;
};

const READ_ICONS: Record<string, React.ReactNode> = {
  list_subjects: <FolderTree className="size-3.5" />,
  search_cards: <Search className="size-3.5" />,
  read_card: <FileText className="size-3.5" />,
  read_links: <Link2 className="size-3.5" />,
};

export function ToolInvocation({
  toolName,
  state,
  result,
}: ToolInvocationProps) {
  // Pending or in-flight call
  if (state !== "result") {
    return (
      <div className="flex items-center gap-2 rounded-(--radius-sm) border border-dashed border-(--color-edge) bg-(--color-cream-2) px-3 py-1.5 text-xs text-(--color-ink-muted)">
        <Loader2 className="size-3.5 animate-spin" />
        <span className="font-mono">{toolName}</span>
        <span>{state === "partial-call" ? "preparing…" : "calling…"}</span>
      </div>
    );
  }

  // Write tools return a Proposal; render the Approve/Cancel card
  const maybeProposal = result as Partial<Proposal> | undefined;
  if (maybeProposal?.status === "pending_approval" && maybeProposal.action) {
    return <ProposalCard proposal={maybeProposal as Proposal} />;
  }

  // Read tools — special-case search_cards for nicer rendering
  if (toolName === "search_cards" && isSearchResult(result)) {
    return <SearchHits result={result} />;
  }
  if (toolName === "list_subjects" && isSubjectTree(result)) {
    return <SubjectTreeView nodes={result.tree} />;
  }
  if (toolName === "read_card" && isReadCardResult(result)) {
    return <ReadCardSummary result={result} />;
  }

  // Generic read-tool result — collapsed JSON
  return (
    <details className="rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) px-3 py-1.5 text-xs">
      <summary className="flex cursor-pointer items-center gap-2 text-(--color-ink-muted)">
        {READ_ICONS[toolName] ?? <Wrench className="size-3.5" />}
        <span className="font-mono">{toolName}</span>
        <span className="text-(--color-mint)">done</span>
      </summary>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-(--color-ink-muted)">
        {JSON.stringify(result, null, 2)}
      </pre>
    </details>
  );
}

// ---------- result type guards ----------

type SearchResult = {
  hits: Array<{
    id: string;
    title: string;
    subjectPath: string;
    rank: number;
    snippet: string;
  }>;
};
function isSearchResult(r: unknown): r is SearchResult {
  return (
    typeof r === "object" && r !== null && Array.isArray((r as SearchResult).hits)
  );
}

type SubjectTree = { tree: Array<{ id: string; name: string; slugPath: string; children: SubjectTree["tree"] }> };
function isSubjectTree(r: unknown): r is SubjectTree {
  return (
    typeof r === "object" && r !== null && Array.isArray((r as SubjectTree).tree)
  );
}

type ReadCardResult = {
  id: string;
  title: string;
  slug: string;
  subjectPath: string;
  format: string;
  status: string;
  content: string;
};
function isReadCardResult(r: unknown): r is ReadCardResult {
  return (
    typeof r === "object" &&
    r !== null &&
    "title" in r &&
    "content" in r &&
    "subjectPath" in r
  );
}

// ---------- specialized renderers ----------

function SearchHits({ result }: { result: SearchResult }) {
  if (result.hits.length === 0) {
    return (
      <div className="rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) px-3 py-2 text-xs text-(--color-ink-muted)">
        <Search className="mr-1 inline size-3.5" /> No matching cards.
      </div>
    );
  }
  return (
    <div className="rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) p-2">
      <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
        <Search className="size-3" /> search_cards · {result.hits.length} hits
      </div>
      <ul className="flex flex-col gap-1">
        {result.hits.map((hit) => (
          <li key={hit.id}>
            <Link
              href={`/c/${hit.id}/edit`}
              className="flex flex-col gap-0.5 rounded-(--radius-xs) px-2 py-1 text-xs no-underline hover:bg-(--color-coral-soft)"
            >
              <span className="font-medium text-(--color-ink)">{hit.title}</span>
              <span className="font-mono text-[10px] text-(--color-ink-muted)">
                {hit.subjectPath} · rank {hit.rank.toFixed(2)}
              </span>
              {hit.snippet ? (
                <span className="line-clamp-2 text-[11px] text-(--color-ink-muted)">
                  {hit.snippet}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubjectTreeView({ nodes }: { nodes: SubjectTree["tree"] }) {
  return (
    <div className="rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) p-2">
      <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
        <FolderTree className="size-3" /> list_subjects
      </div>
      <SubjectNodes nodes={nodes} depth={0} />
    </div>
  );
}

function SubjectNodes({
  nodes,
  depth,
}: {
  nodes: SubjectTree["tree"];
  depth: number;
}) {
  return (
    <ul className="flex flex-col">
      {nodes.map((n) => (
        <li key={n.id}>
          <Link
            href={`/s/${n.slugPath}`}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
            className="flex items-center gap-1 py-0.5 text-xs text-(--color-ink) no-underline hover:text-(--color-coral)"
          >
            {depth > 0 ? (
              <ChevronRight className="size-3 text-(--color-ink-muted)" />
            ) : null}
            <span>{n.name}</span>
            <span className="ml-2 font-mono text-[10px] text-(--color-ink-muted)">
              {n.slugPath}
            </span>
          </Link>
          {n.children.length > 0 ? (
            <SubjectNodes nodes={n.children} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ReadCardSummary({ result }: { result: ReadCardResult }) {
  return (
    <div className="rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) p-2 text-xs">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
        <FileText className="size-3" /> read_card
      </div>
      <Link
        href={`/c/${result.id}/edit`}
        className="flex flex-col gap-0.5 px-1 text-(--color-ink) no-underline hover:text-(--color-coral)"
      >
        <span className="font-medium">{result.title}</span>
        <span className="font-mono text-[10px] text-(--color-ink-muted)">
          {result.subjectPath} · {result.format} · {result.status}
        </span>
      </Link>
      <details className="mt-1 rounded-(--radius-xs) bg-(--color-cream-3) p-2">
        <summary className="cursor-pointer text-[10px] text-(--color-ink-muted)">
          source ({result.content.length} chars)
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-(--color-ink)">
          {result.content}
        </pre>
      </details>
    </div>
  );
}
