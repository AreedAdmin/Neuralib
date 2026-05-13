"use client";

import { Plus, Tag, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { attachTagToCard, detachTagFromCard } from "@/lib/actions/tags";

type TagLite = { id: string; name: string; color: string | null };

export function CardTagBar({
  cardId,
  initial,
  available,
}: {
  cardId: string;
  initial: TagLite[];
  available: TagLite[];
}) {
  const [tags, setTags] = useState<TagLite[]>(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function commitAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      setDraft("");
      return;
    }
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.message("Tag already on this card.");
      setAdding(false);
      setDraft("");
      return;
    }
    startTransition(async () => {
      const res = await attachTagToCard({ cardId, tagName: trimmed });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const existing = available.find(
        (t) => t.name.toLowerCase() === trimmed.toLowerCase()
      );
      const optimistic: TagLite = existing ?? {
        id: `tmp-${Date.now()}`,
        name: trimmed,
        color: null,
      };
      setTags((prev) => [...prev, optimistic]);
      setAdding(false);
      setDraft("");
    });
  }

  function handleRemove(tagId: string) {
    startTransition(async () => {
      const res = await detachTagFromCard({ cardId, tagId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    });
  }

  const suggestions = adding
    ? available
        .filter(
          (t) =>
            !tags.some((own) => own.id === t.id) &&
            (draft === "" || t.name.toLowerCase().startsWith(draft.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-(--color-edge) bg-(--color-cream-2) px-4 py-1.5">
      <Tag className="size-3.5 text-(--color-ink-muted)" aria-hidden />
      {tags.length === 0 && !adding ? (
        <span className="text-xs text-(--color-ink-muted)">No tags yet</span>
      ) : null}
      {tags.map((t) => (
        <span
          key={t.id}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-(--color-ink)"
          style={{
            backgroundColor: t.color
              ? `color-mix(in oklab, ${t.color}, white 70%)`
              : "var(--color-cream-3)",
          }}
        >
          {t.name}
          <button
            type="button"
            aria-label={`Remove tag ${t.name}`}
            onClick={() => handleRemove(t.id)}
            disabled={pending}
            className="text-(--color-ink-muted) hover:text-(--color-coral) disabled:opacity-50"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <span className="relative">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (!draft.trim()) {
                setAdding(false);
                setDraft("");
              } else {
                commitAdd(draft);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitAdd(draft);
              } else if (e.key === "Escape") {
                setAdding(false);
                setDraft("");
              }
            }}
            autoFocus
            placeholder="Tag name…"
            className="rounded-full bg-(--color-cream-3) px-2 py-0.5 text-xs text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)"
          />
          {suggestions.length > 0 ? (
            <ul className="absolute left-0 top-full z-10 mt-1 flex min-w-[160px] flex-col rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) py-1 shadow-(--shadow-soft)">
              {suggestions.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commitAdd(t.name);
                    }}
                    className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs text-(--color-ink) hover:bg-(--color-coral-soft)"
                  >
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ backgroundColor: t.color ?? "var(--color-ink-muted)" }}
                    />
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={pending}
          className="flex items-center gap-1 rounded-full border border-dashed border-(--color-edge) px-2 py-0.5 text-xs text-(--color-ink-muted) hover:border-(--color-coral) hover:text-(--color-coral) disabled:opacity-50"
        >
          <Plus className="size-3" /> Tag
        </button>
      )}
    </div>
  );
}
