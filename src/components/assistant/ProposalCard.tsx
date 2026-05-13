"use client";

import {
  Check,
  CornerDownRight,
  FilePlus,
  FolderPlus,
  Link2,
  Loader2,
  Pencil,
  Tag,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Proposal } from "@/lib/ai/tools";

type ApplyState =
  | { kind: "idle" }
  | { kind: "applying" }
  | { kind: "applied"; result?: Record<string, unknown> }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

const ICON_FOR_ACTION: Record<Proposal["action"], React.ReactNode> = {
  create_subject: <FolderPlus className="size-4" />,
  create_card: <FilePlus className="size-4" />,
  update_card: <Pencil className="size-4" />,
  add_tag: <Tag className="size-4" />,
  link_cards: <Link2 className="size-4" />,
};

const LABEL_FOR_ACTION: Record<Proposal["action"], string> = {
  create_subject: "Create subject",
  create_card: "Create card",
  update_card: "Update card",
  add_tag: "Add tag",
  link_cards: "Link cards",
};

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [state, setState] = useState<ApplyState>({ kind: "idle" });

  async function apply() {
    setState({ kind: "applying" });
    try {
      const res = await fetch("/api/assistant/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });
      const data = (await res.json()) as
        | { ok: true; result: Record<string, unknown> }
        | { ok: false; error: string };
      if (!data.ok) {
        setState({ kind: "error", message: data.error });
        toast.error(data.error);
        return;
      }
      setState({ kind: "applied", result: data.result });
      toast.success(`${LABEL_FOR_ACTION[proposal.action]} applied.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ kind: "error", message: msg });
      toast.error(msg);
    }
  }

  function cancel() {
    setState({ kind: "cancelled" });
  }

  return (
    <div className="rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) shadow-(--shadow-soft)">
      <header className="flex items-center gap-2 border-b border-(--color-edge) px-3 py-2">
        <span className="flex size-7 items-center justify-center rounded-(--radius-xs) bg-(--color-coral-soft) text-(--color-coral)">
          {ICON_FOR_ACTION[proposal.action]}
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          Proposal · {LABEL_FOR_ACTION[proposal.action]}
        </span>
        <StatusBadge state={state} />
      </header>

      <ProposalBody proposal={proposal} />

      {state.kind === "idle" || state.kind === "error" ? (
        <footer className="flex items-center justify-end gap-2 border-t border-(--color-edge) px-3 py-2">
          {state.kind === "error" ? (
            <p className="mr-auto truncate text-xs text-(--color-coral)">
              {state.message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 rounded-(--radius-xs) px-2 py-1 text-xs text-(--color-ink-muted) hover:bg-(--color-cream-3) hover:text-(--color-ink)"
          >
            <X className="size-3.5" /> Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex items-center gap-1 rounded-(--radius-xs) bg-(--color-coral) px-3 py-1.5 text-xs font-semibold text-white hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)]"
          >
            <Check className="size-3.5" /> Approve
          </button>
        </footer>
      ) : null}

      {state.kind === "applied" && proposal.action === "create_card" ? (
        <footer className="flex items-center gap-2 border-t border-(--color-edge) px-3 py-2 text-xs text-(--color-ink-muted)">
          <CornerDownRight className="size-3.5" />
          Card created.
          {state.result?.cardId ? (
            <a
              href={`/c/${state.result.cardId}/edit`}
              className="text-(--color-sky) hover:underline"
            >
              Open in editor →
            </a>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}

function StatusBadge({ state }: { state: ApplyState }) {
  if (state.kind === "applied")
    return (
      <span className="ml-auto flex items-center gap-1 text-xs text-(--color-mint)">
        <Check className="size-3.5" /> Applied
      </span>
    );
  if (state.kind === "applying")
    return (
      <span className="ml-auto flex items-center gap-1 text-xs text-(--color-sky)">
        <Loader2 className="size-3.5 animate-spin" /> Applying
      </span>
    );
  if (state.kind === "cancelled")
    return (
      <span className="ml-auto text-xs text-(--color-ink-muted)">Cancelled</span>
    );
  if (state.kind === "error")
    return (
      <span className="ml-auto text-xs text-(--color-coral)">Error</span>
    );
  return <span className="ml-auto text-xs text-(--color-warning)">Pending</span>;
}

function ProposalBody({ proposal }: { proposal: Proposal }) {
  switch (proposal.action) {
    case "create_subject":
      return (
        <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 px-3 py-2 text-xs">
          <dt className="text-(--color-ink-muted)">Name</dt>
          <dd className="text-(--color-ink)">{proposal.args.name}</dd>
          <dt className="text-(--color-ink-muted)">Parent</dt>
          <dd className="font-mono text-(--color-ink)">
            {proposal.args.parent_slug_path ?? "(top-level)"}
          </dd>
        </dl>
      );
    case "create_card":
      return (
        <div className="flex flex-col gap-2 px-3 py-2">
          <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-(--color-ink-muted)">Title</dt>
            <dd className="text-(--color-ink)">{proposal.args.title}</dd>
            <dt className="text-(--color-ink-muted)">Subject</dt>
            <dd className="font-mono text-(--color-ink)">{proposal.args.subject_slug_path}</dd>
            <dt className="text-(--color-ink-muted)">Format</dt>
            <dd className="font-mono text-(--color-ink)">
              {proposal.args.format ?? "latex_fragment"}
            </dd>
          </dl>
          <details className="rounded-(--radius-xs) bg-(--color-cream-3) p-2">
            <summary className="cursor-pointer text-xs text-(--color-ink-muted)">
              LaTeX content ({proposal.args.content.length} chars)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-(--color-ink)">
              {proposal.args.content}
            </pre>
          </details>
        </div>
      );
    case "update_card":
      return (
        <div className="flex flex-col gap-2 px-3 py-2">
          <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-(--color-ink-muted)">Card ID</dt>
            <dd className="truncate font-mono text-(--color-ink)">{proposal.args.cardId}</dd>
            {proposal.args.message ? (
              <>
                <dt className="text-(--color-ink-muted)">Message</dt>
                <dd className="text-(--color-ink)">{proposal.args.message}</dd>
              </>
            ) : null}
          </dl>
          <details className="rounded-(--radius-xs) bg-(--color-cream-3) p-2" open>
            <summary className="cursor-pointer text-xs text-(--color-ink-muted)">
              New LaTeX content ({proposal.args.content.length} chars)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-(--color-ink)">
              {proposal.args.content}
            </pre>
          </details>
        </div>
      );
    case "add_tag":
      return (
        <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 px-3 py-2 text-xs">
          <dt className="text-(--color-ink-muted)">Card ID</dt>
          <dd className="truncate font-mono text-(--color-ink)">{proposal.args.cardId}</dd>
          <dt className="text-(--color-ink-muted)">Tag</dt>
          <dd className="text-(--color-ink)">{proposal.args.tagName}</dd>
        </dl>
      );
    case "link_cards":
      return (
        <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 px-3 py-2 text-xs">
          <dt className="text-(--color-ink-muted)">From</dt>
          <dd className="truncate font-mono text-(--color-ink)">{proposal.args.sourceCardId}</dd>
          <dt className="text-(--color-ink-muted)">To</dt>
          <dd className="truncate font-mono text-(--color-ink)">{proposal.args.targetCardId}</dd>
          <dt className="text-(--color-ink-muted)">Kind</dt>
          <dd className="text-(--color-ink)">{proposal.args.kind}</dd>
          {proposal.args.note ? (
            <>
              <dt className="text-(--color-ink-muted)">Note</dt>
              <dd className="text-(--color-ink)">{proposal.args.note}</dd>
            </>
          ) : null}
        </dl>
      );
  }
}
