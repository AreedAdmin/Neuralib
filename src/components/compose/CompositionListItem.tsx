"use client";

import { Compass, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteComposition } from "@/lib/actions/compositions";
import type { Composition } from "@/lib/db/compositions";

export function CompositionListItem({
  composition,
  kindColor,
}: {
  composition: Composition;
  kindColor: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `Delete composition "${composition.title}"? Entries are removed; the source cards stay.`
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteComposition(composition.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Composition deleted.");
    });
  }

  const updated = new Date(composition.updated_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="group flex items-center gap-3 rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) px-4 py-3 hover:border-(--color-coral)">
      <Compass className="size-4 shrink-0" style={{ color: kindColor }} aria-hidden />
      <Link
        href={`/compose/${composition.id}`}
        className="flex flex-1 flex-col gap-0.5 text-(--color-ink) no-underline"
      >
        <span className="font-medium">{composition.title}</span>
        {composition.subtitle ? (
          <span className="line-clamp-1 text-sm text-(--color-ink-muted)">
            {composition.subtitle}
          </span>
        ) : null}
      </Link>
      <span
        className="rounded-full px-2 py-0.5 text-xs font-medium"
        style={{
          backgroundColor: `color-mix(in oklab, ${kindColor}, white 75%)`,
          color: kindColor,
        }}
      >
        {composition.kind}
      </span>
      <span className="shrink-0 text-xs text-(--color-ink-muted)">{updated}</span>
      <button
        type="button"
        aria-label="Delete composition"
        onClick={handleDelete}
        disabled={pending}
        className="flex size-7 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) opacity-0 transition-opacity hover:bg-(--color-cream-3) hover:text-(--color-coral) group-hover:opacity-100 disabled:opacity-30"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
