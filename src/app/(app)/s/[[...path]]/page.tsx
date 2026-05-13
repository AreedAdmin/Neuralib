import { ChevronRight, Folder, FolderTree } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardListItem } from "@/components/cards/CardListItem";
import { ImportTexButton } from "@/components/cards/ImportTexButton";
import { NewCardButton } from "@/components/cards/NewCardButton";
import { listCardsBySubject } from "@/lib/db/cards";
import {
  buildSubjectTree,
  findSubjectByPath,
  listSubjects,
  pathFor,
  type SubjectNode,
} from "@/lib/db/subjects";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const subjects = await listSubjects();
  const tree = buildSubjectTree(subjects);

  if (path.length === 0) {
    return <RootView tree={tree} />;
  }

  const subject = findSubjectByPath(tree, path);
  if (!subject) notFound();

  const cards = await listCardsBySubject(subject.id);
  const ancestors = pathFor(subjects, subject.id).slice(0, -1);
  const ancestorNames = ancestors.map((slug, i) => {
    const part = subjects.find((s) =>
      s.slug === slug && pathFor(subjects, s.id).join("/") === ancestors.slice(0, i + 1).join("/")
    );
    return { slug, name: part?.name ?? slug };
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-8 py-10">
      <Breadcrumbs ancestors={ancestorNames} current={subject.name} ancestorSlugs={ancestors} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-(--color-ink)">
            {subject.name}
          </h1>
          {subject.description ? (
            <p className="mt-1 max-w-2xl text-(--color-ink-muted)">{subject.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ImportTexButton subjectId={subject.id} />
          <NewCardButton subjectId={subject.id} />
        </div>
      </header>

      {subject.children.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
            Sub-subjects
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subject.children.map((child) => (
              <Link
                key={child.id}
                href={`/s/${[...path, child.slug].join("/")}`}
                className="flex items-center gap-2 rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) px-3 py-2 text-(--color-ink) no-underline hover:border-(--color-coral)"
              >
                <Folder className="size-4 text-(--color-ink-muted)" aria-hidden />
                <span className="truncate">{child.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          Cards ({cards.length})
        </h2>
        {cards.length === 0 ? (
          <p className="rounded-(--radius-sm) border border-dashed border-(--color-edge) bg-(--color-cream-2) px-4 py-8 text-center text-(--color-ink-muted)">
            No cards yet. Click <span className="font-medium">New card</span> to add one.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cards.map((card) => (
              <CardListItem key={card.id} card={card} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function RootView({ tree }: { tree: SubjectNode[] }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-8 py-10">
      <header className="flex items-center gap-3">
        <FolderTree className="size-6 text-(--color-coral)" aria-hidden />
        <h1 className="text-3xl font-semibold tracking-tight text-(--color-ink)">
          All subjects
        </h1>
      </header>
      {tree.length === 0 ? (
        <p className="text-(--color-ink-muted)">
          No subjects yet. Use the <span className="font-medium">+</span> in the sidebar.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tree.map((s) => (
            <Link
              key={s.id}
              href={`/s/${s.slug}`}
              className="flex items-center gap-2 rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) px-3 py-2 text-(--color-ink) no-underline hover:border-(--color-coral)"
            >
              <Folder className="size-4 text-(--color-ink-muted)" aria-hidden />
              <span className="truncate">{s.name}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function Breadcrumbs({
  ancestors,
  ancestorSlugs,
  current,
}: {
  ancestors: { slug: string; name: string }[];
  ancestorSlugs: string[];
  current: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-(--color-ink-muted)">
      <Link href="/s" className="no-underline hover:text-(--color-ink)">
        Subjects
      </Link>
      {ancestors.map((a, i) => (
        <span key={a.slug} className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5" aria-hidden />
          <Link
            href={`/s/${ancestorSlugs.slice(0, i + 1).join("/")}`}
            className="no-underline hover:text-(--color-ink)"
          >
            {a.name}
          </Link>
        </span>
      ))}
      <ChevronRight className="size-3.5" aria-hidden />
      <span className="font-medium text-(--color-ink)">{current}</span>
    </nav>
  );
}
