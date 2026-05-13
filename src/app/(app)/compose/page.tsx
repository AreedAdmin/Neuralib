import { BookOpen, Compass } from "lucide-react";
import Link from "next/link";
import { NewCompositionButton } from "@/components/compose/NewCompositionButton";
import { CompositionListItem } from "@/components/compose/CompositionListItem";
import { listCompositions } from "@/lib/db/compositions";

const KIND_COLOR: Record<string, string> = {
  textbook: "var(--color-coral)",
  cheatsheet: "var(--color-mint)",
  lecture: "var(--color-sky)",
  note_pack: "var(--color-warning)",
  custom: "var(--color-ink-muted)",
};

export default async function CompositionsPage() {
  const compositions = await listCompositions();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-8 py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Compass className="size-6 text-(--color-coral)" aria-hidden />
          <h1 className="text-3xl font-semibold tracking-tight text-(--color-ink)">
            Compositions
          </h1>
        </div>
        <NewCompositionButton />
      </header>

      <p className="max-w-2xl text-(--color-ink-muted)">
        Stitch ordered cards into a single PDF. Each card&rsquo;s{" "}
        <code className="rounded bg-(--color-cream-3) px-1.5 py-0.5 font-mono text-sm">
          \label{"{}"}
        </code>{" "}
        is namespaced by the card slug at compile time, so cross-card{" "}
        <code className="rounded bg-(--color-cream-3) px-1.5 py-0.5 font-mono text-sm">
          \ref{"{slug:label}"}
        </code>{" "}
        is explicit and stable as cards move between books.
      </p>

      {compositions.length === 0 ? (
        <section className="rounded-(--radius-md) border border-dashed border-(--color-edge) bg-(--color-cream-2) p-8 text-center shadow-(--shadow-soft)">
          <div className="mx-auto flex size-12 items-center justify-center rounded-(--radius-md) bg-(--color-coral-soft) text-(--color-coral)" aria-hidden>
            <BookOpen className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-(--color-ink)">
            No compositions yet.
          </h2>
          <p className="mt-1 text-(--color-ink-muted)">
            Create one to start assembling a textbook.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-2">
          {compositions.map((c) => (
            <CompositionListItem
              key={c.id}
              composition={c}
              kindColor={KIND_COLOR[c.kind] ?? KIND_COLOR.custom}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
