"use client";

import { FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteCard } from "@/lib/actions/cards";
import type { Card } from "@/lib/db/cards";

const STATUS_COLOR: Record<Card["status"], string> = {
  draft: "var(--color-warning)",
  published: "var(--color-mint)",
  archived: "var(--color-ink-muted)",
};

export function CardListItem({ card }: { card: Card }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete "${card.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteCard(card.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Card deleted.");
    });
  }

  const updated = new Date(card.updated_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="group flex items-center gap-3 rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) px-4 py-3 hover:border-(--color-coral)">
      <FileText className="size-4 shrink-0 text-(--color-ink-muted)" aria-hidden />
      <Link
        href={`/c/${card.id}/edit`}
        className="flex flex-1 flex-col gap-0.5 text-(--color-ink) no-underline"
      >
        <span className="font-medium">{card.title}</span>
        {card.summary ? (
          <span className="line-clamp-1 text-sm text-(--color-ink-muted)">
            {card.summary}
          </span>
        ) : null}
      </Link>
      <span
        className="rounded-full px-2 py-0.5 text-xs font-medium"
        style={{
          backgroundColor: `color-mix(in oklab, ${STATUS_COLOR[card.status]}, white 75%)`,
          color: STATUS_COLOR[card.status],
        }}
      >
        {card.status}
      </span>
      <span className="shrink-0 text-xs text-(--color-ink-muted)">{updated}</span>
      <button
        type="button"
        aria-label="Delete card"
        title="Delete card"
        onClick={handleDelete}
        disabled={pending}
        className="flex size-7 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) opacity-0 transition-opacity hover:bg-(--color-cream-3) hover:text-(--color-coral) group-hover:opacity-100 disabled:opacity-30"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
