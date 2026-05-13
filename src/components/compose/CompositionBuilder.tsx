"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  FileText,
  GripVertical,
  Hammer,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addEntry,
  removeEntry,
  reorderEntries,
} from "@/lib/actions/compositions";

type AvailableCard = {
  id: string;
  title: string;
  slug: string;
  subjectName: string;
  subjectPath: string[];
};

type Entry = {
  id: string;
  position: number;
  kind: string;
  cardId: string | null;
  cardTitle: string | null;
  cardSlug: string | null;
  cardSubjectName: string | null;
  headingLevel: number | null;
  headingText: string | null;
};

export function CompositionBuilder({
  composition,
  entries: initialEntries,
  availableCards,
}: {
  composition: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    kind: string;
  };
  entries: Entry[];
  availableCards: AvailableCard[];
}) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [cardFilter, setCardFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [compiling, setCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const inUseCardIds = useMemo(
    () => new Set(entries.map((e) => e.cardId).filter((id): id is string => Boolean(id))),
    [entries]
  );

  const filteredCards = useMemo(() => {
    const q = cardFilter.trim().toLowerCase();
    if (!q) return availableCards;
    return availableCards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subjectName.toLowerCase().includes(q) ||
        c.subjectPath.join(" / ").toLowerCase().includes(q)
    );
  }, [availableCards, cardFilter]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(entries, oldIndex, newIndex);
    setEntries(next);

    startTransition(async () => {
      const res = await reorderEntries(
        composition.id,
        next.map((e) => e.id)
      );
      if (!res.ok) {
        toast.error(res.error);
        setEntries(entries); // revert
      }
    });
  }

  function handleAdd(cardId: string) {
    startTransition(async () => {
      const res = await addEntry({ compositionId: composition.id, cardId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const card = availableCards.find((c) => c.id === cardId);
      if (card) {
        setEntries((prev) => [
          ...prev,
          {
            id: `tmp-${Date.now()}`,
            position: prev.length,
            kind: "card",
            cardId: card.id,
            cardTitle: card.title,
            cardSlug: card.slug,
            cardSubjectName: card.subjectName,
            headingLevel: null,
            headingText: null,
          },
        ]);
        toast.success(`Added "${card.title}".`);
      }
    });
  }

  function handleRemove(entry: Entry) {
    startTransition(async () => {
      const res = await removeEntry(entry.id, composition.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    });
  }

  async function handleCompile() {
    if (compiling) return;
    setCompiling(true);
    setPdfUrl(null);
    try {
      const res = await fetch("/api/compile/composition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionId: composition.id }),
      });
      const data = (await res.json()) as
        | { ok: true; pdfUrl: string; cached: boolean; cardCount: number; warnings?: string[] }
        | { ok: false; error: string; reason: string; log?: string };
      if (!data.ok) {
        toast.error(data.error.split("\n")[0]);
      } else {
        setPdfUrl(data.pdfUrl);
        toast.success(
          data.cached
            ? `Loaded cached book (${data.cardCount} cards).`
            : `Compiled book (${data.cardCount} cards).`
        );
        if (data.warnings?.length) {
          for (const w of data.warnings) toast.message(w);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCompiling(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-8 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-(--color-edge) pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-(--color-coral)">
            Composition · {composition.kind}
          </p>
          <h1 className="truncate text-3xl font-semibold tracking-tight text-(--color-ink)">
            {composition.title}
          </h1>
          {composition.subtitle ? (
            <p className="text-(--color-ink-muted)">{composition.subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleCompile}
          disabled={compiling || entries.length === 0}
          className="flex items-center gap-2 rounded-(--radius-sm) bg-(--color-coral) px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)] disabled:opacity-50"
        >
          {compiling ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Hammer className="size-4" />
          )}
          {compiling ? "Compiling…" : "Compile book"}
        </button>
      </header>

      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="self-start rounded-(--radius-sm) bg-(--color-mint-soft) px-3 py-1.5 text-sm font-medium text-(--color-mint) hover:opacity-80"
        >
          Open PDF in new tab →
        </a>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex min-h-[60vh] flex-col gap-3 rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) p-4 shadow-(--shadow-soft)">
          <header className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
              Available cards ({availableCards.length})
            </h2>
          </header>
          <label className="flex items-center gap-2 rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-1) px-3 py-1.5 focus-within:border-(--color-coral)">
            <Search className="size-4 text-(--color-ink-muted)" aria-hidden />
            <input
              value={cardFilter}
              onChange={(e) => setCardFilter(e.target.value)}
              placeholder="Filter by title or subject…"
              className="flex-1 bg-transparent py-1 text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)"
            />
          </label>
          <ul className="flex max-h-[55vh] flex-col gap-1 overflow-y-auto pr-1">
            {filteredCards.length === 0 ? (
              <li className="px-2 py-4 text-center text-sm text-(--color-ink-muted)">
                No cards match.
              </li>
            ) : (
              filteredCards.map((card) => {
                const used = inUseCardIds.has(card.id);
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => handleAdd(card.id)}
                      disabled={used || pending}
                      className="flex w-full items-center gap-2 rounded-(--radius-xs) px-2 py-1.5 text-left hover:bg-(--color-cream-3) disabled:opacity-40"
                    >
                      <FileText className="size-4 shrink-0 text-(--color-ink-muted)" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-(--color-ink)">{card.title}</div>
                        <div className="truncate text-xs text-(--color-ink-muted)">
                          {card.subjectPath.join(" / ") || card.subjectName}
                        </div>
                      </div>
                      {used ? (
                        <span className="text-xs text-(--color-mint)">added</span>
                      ) : (
                        <Plus className="size-4 text-(--color-ink-muted)" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="flex min-h-[60vh] flex-col gap-3 rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) p-4 shadow-(--shadow-soft)">
          <header className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
              Order ({entries.length})
            </h2>
          </header>
          {entries.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-(--color-ink-muted)">
              Add cards from the left to start building.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={entries.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-2">
                  {entries.map((entry, i) => (
                    <SortableEntry
                      key={entry.id}
                      entry={entry}
                      index={i}
                      onRemove={() => handleRemove(entry)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>
    </main>
  );
}

function SortableEntry({
  entry,
  index,
  onRemove,
}: {
  entry: Entry;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-1) px-2 py-2"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab text-(--color-ink-muted) hover:text-(--color-ink) active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 shrink-0 text-center font-mono text-xs text-(--color-ink-muted)">
        {index + 1}
      </span>
      {entry.kind === "card" ? (
        <FileText className="size-4 shrink-0 text-(--color-ink-muted)" aria-hidden />
      ) : entry.kind === "page_break" ? (
        <ChevronRight className="size-4 shrink-0 text-(--color-ink-muted)" aria-hidden />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-(--color-ink)">
          {entry.kind === "card"
            ? entry.cardTitle ?? "(deleted card)"
            : entry.kind === "heading"
              ? entry.headingText ?? "(heading)"
              : entry.kind === "page_break"
                ? "Page break"
                : "Raw"}
        </div>
        {entry.cardSubjectName ? (
          <div className="truncate text-xs text-(--color-ink-muted)">
            {entry.cardSubjectName}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Remove entry"
        onClick={onRemove}
        className="flex size-7 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) hover:bg-(--color-cream-3) hover:text-(--color-coral)"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
