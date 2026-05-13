"use client";

import { ArrowLeftRight, ChevronDown, ChevronUp, Link2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createLink, deleteLink } from "@/lib/actions/links";
import type { Enums } from "@/lib/supabase/types";
import type { LinkedCard, LinkKind } from "@/lib/db/links";

type CardOption = {
  id: string;
  title: string;
  subjectName: string;
};

const KIND_LABEL: Record<LinkKind, string> = {
  related: "Related",
  depends_on: "Depends on",
  extends: "Extends",
  cites: "Cites",
};

const KIND_COLOR: Record<LinkKind, string> = {
  related: "var(--color-sky)",
  depends_on: "var(--color-coral)",
  extends: "var(--color-mint)",
  cites: "var(--color-warning)",
};

export function CardLinksPanel({
  cardId,
  outgoing: initialOut,
  incoming,
  availableCards,
}: {
  cardId: string;
  outgoing: LinkedCard[];
  incoming: LinkedCard[];
  availableCards: CardOption[];
}) {
  const [open, setOpen] = useState(true);
  const [outgoing, setOutgoing] = useState<LinkedCard[]>(initialOut);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftKind, setDraftKind] = useState<LinkKind>("related");
  const [pending, startTransition] = useTransition();

  const candidates = adding
    ? availableCards
        .filter(
          (c) =>
            c.id !== cardId &&
            !outgoing.some((o) => o.card.id === c.id) &&
            (draft === "" || c.title.toLowerCase().includes(draft.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  function handleAdd(target: CardOption) {
    startTransition(async () => {
      const res = await createLink({
        sourceCardId: cardId,
        targetCardId: target.id,
        kind: draftKind as Enums<"link_kind">,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOutgoing((prev) => [
        ...prev,
        {
          linkId: `tmp-${Date.now()}`,
          kind: draftKind,
          note: null,
          card: {
            id: target.id,
            title: target.title,
            slug: "",
            subjectId: "",
          },
        },
      ]);
      setAdding(false);
      setDraft("");
      setDraftKind("related");
    });
  }

  function handleRemove(linkId: string) {
    startTransition(async () => {
      const res = await deleteLink(linkId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOutgoing((prev) => prev.filter((o) => o.linkId !== linkId));
    });
  }

  const total = outgoing.length + incoming.length;

  return (
    <section className="border-t border-(--color-edge) bg-(--color-cream-2)">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          <Link2 className="size-3.5" /> See also
          {total > 0 ? (
            <span className="rounded-full bg-(--color-cream-3) px-1.5 py-0.5 font-mono text-[10px]">
              {total}
            </span>
          ) : null}
        </span>
        {open ? (
          <ChevronUp className="size-4 text-(--color-ink-muted)" />
        ) : (
          <ChevronDown className="size-4 text-(--color-ink-muted)" />
        )}
      </button>

      {open ? (
        <div className="flex max-h-[28vh] flex-col gap-3 overflow-y-auto px-4 pb-3">
          <LinkGroup
            label="Outgoing"
            items={outgoing}
            onRemove={handleRemove}
            removable
          />
          <LinkGroup
            label="Backlinks"
            items={incoming}
            onRemove={() => {}}
            removable={false}
            empty="No card links to this one yet."
          />

          {adding ? (
            <div className="flex flex-col gap-1.5 rounded-(--radius-sm) bg-(--color-cream-3) p-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={draftKind}
                  onChange={(e) => setDraftKind(e.target.value as LinkKind)}
                  className="rounded-(--radius-xs) border border-(--color-edge) bg-(--color-cream-2) px-2 py-1 text-xs text-(--color-ink)"
                >
                  {(Object.keys(KIND_LABEL) as LinkKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  placeholder="Search cards…"
                  className="flex-1 rounded-(--radius-xs) border border-(--color-edge) bg-(--color-cream-2) px-2 py-1 text-xs text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)"
                />
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => {
                    setAdding(false);
                    setDraft("");
                  }}
                  className="text-(--color-ink-muted) hover:text-(--color-coral)"
                >
                  <X className="size-4" />
                </button>
              </div>
              {candidates.length > 0 ? (
                <ul className="flex flex-col">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleAdd(c)}
                        className="flex w-full items-center justify-between gap-2 rounded-(--radius-xs) px-2 py-1 text-left text-xs text-(--color-ink) hover:bg-(--color-coral-soft) disabled:opacity-50"
                      >
                        <span className="truncate">{c.title}</span>
                        <span className="shrink-0 text-(--color-ink-muted)">
                          {c.subjectName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-1 text-xs text-(--color-ink-muted)">
                  No matching cards.
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 self-start rounded-(--radius-xs) border border-dashed border-(--color-edge) px-2 py-1 text-xs text-(--color-ink-muted) hover:border-(--color-coral) hover:text-(--color-coral)"
            >
              <Plus className="size-3" /> Link a card
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function LinkGroup({
  label,
  items,
  onRemove,
  removable,
  empty,
}: {
  label: string;
  items: LinkedCard[];
  onRemove: (linkId: string) => void;
  removable: boolean;
  empty?: string;
}) {
  if (items.length === 0 && !empty) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--color-ink-muted)">
        <ArrowLeftRight className="size-3" /> {label}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-(--color-ink-muted)">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.linkId}
              className="flex items-center gap-2 rounded-(--radius-xs) bg-(--color-cream-1) px-2 py-1"
            >
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `color-mix(in oklab, ${KIND_COLOR[item.kind]}, white 78%)`,
                  color: KIND_COLOR[item.kind],
                }}
              >
                {KIND_LABEL[item.kind]}
              </span>
              <Link
                href={`/c/${item.card.id}/edit`}
                className="flex-1 truncate text-xs text-(--color-ink) no-underline hover:text-(--color-coral)"
              >
                {item.card.title}
              </Link>
              {removable ? (
                <button
                  type="button"
                  aria-label="Remove link"
                  onClick={() => onRemove(item.linkId)}
                  className="text-(--color-ink-muted) hover:text-(--color-coral)"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
