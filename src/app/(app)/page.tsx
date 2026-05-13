import { BookOpen, Compass, FileText, Search } from "lucide-react";
import Link from "next/link";
import { listSubjects } from "@/lib/db/subjects";

export default async function Home() {
  const subjects = await listSubjects();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-12 px-8 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-(--color-coral)">
          Daylight Study
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-(--color-ink)">
          A bright library for the things you learn.
        </h1>
        <p className="max-w-2xl text-lg text-(--color-ink-muted)">
          Hierarchical subjects, LaTeX cards, and composable textbooks. Search anything,
          render it cleanly, keep moving.
        </p>
      </header>

      {subjects.length === 0 ? (
        <section className="rounded-(--radius-lg) border border-(--color-edge) bg-(--color-cream-2) p-8 shadow-(--shadow-soft)">
          <div className="flex items-start gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--color-coral-soft) text-(--color-coral)"
              aria-hidden
            >
              <BookOpen className="size-6" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-(--color-ink)">
                Start with a subject.
              </h2>
              <p className="text-(--color-ink-muted)">
                Click <span className="font-medium">+</span> in the sidebar to create your
                first subject — say, <code className="rounded bg-(--color-cream-3) px-1.5 py-0.5 font-mono text-sm text-(--color-ink)">Algorithms</code>{" "}
                — then nest <code className="rounded bg-(--color-cream-3) px-1.5 py-0.5 font-mono text-sm text-(--color-ink)">Graph Algorithms</code>{" "}
                inside, and add a card for{" "}
                <code className="rounded bg-(--color-cream-3) px-1.5 py-0.5 font-mono text-sm text-(--color-ink)">PageRank</code>.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
            Top subjects
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subjects
              .filter((s) => !s.parent_id)
              .map((s) => (
                <Link
                  key={s.id}
                  href={`/s/${s.slug}`}
                  className="rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) p-4 no-underline shadow-(--shadow-soft) hover:border-(--color-coral)"
                >
                  <p className="font-medium text-(--color-ink)">{s.name}</p>
                  {s.description ? (
                    <p className="mt-1 text-sm text-(--color-ink-muted)">{s.description}</p>
                  ) : null}
                </Link>
              ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={<Search className="size-5" />}
          title="Quick search"
          body="⌘K opens any card by title, content, or tag (Phase 4)."
          accent="var(--color-sky)"
          accentSoft="var(--color-sky-soft)"
        />
        <FeatureCard
          icon={<FileText className="size-5" />}
          title="LaTeX cards"
          body="Each card is a .tex file. KaTeX, TikZ, theorem environments — textbook-grade."
          accent="var(--color-mint)"
          accentSoft="var(--color-mint-soft)"
        />
        <FeatureCard
          icon={<Compass className="size-5" />}
          title="Compositions"
          body="Stitch cards together into chapter-numbered PDFs (Phase 5)."
          accent="var(--color-coral)"
          accentSoft="var(--color-coral-soft)"
        />
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  accent,
  accentSoft,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
  accentSoft: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) p-5 shadow-(--shadow-soft)">
      <div
        className="flex size-9 items-center justify-center rounded-(--radius-sm)"
        style={{ backgroundColor: accentSoft, color: accent }}
        aria-hidden
      >
        {icon}
      </div>
      <h4 className="font-semibold text-(--color-ink)">{title}</h4>
      <p className="text-sm leading-relaxed text-(--color-ink-muted)">{body}</p>
    </article>
  );
}
