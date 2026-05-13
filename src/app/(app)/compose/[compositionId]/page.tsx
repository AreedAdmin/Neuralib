import { notFound } from "next/navigation";
import { CompositionBuilder } from "@/components/compose/CompositionBuilder";
import { listAllCards } from "@/lib/db/cards";
import {
  getComposition,
  getCompositionEntries,
} from "@/lib/db/compositions";
import { listSubjects, pathFor } from "@/lib/db/subjects";

export default async function CompositionPage({
  params,
}: {
  params: Promise<{ compositionId: string }>;
}) {
  const { compositionId } = await params;
  const composition = await getComposition(compositionId);
  if (!composition) notFound();

  const [entries, cards, subjects] = await Promise.all([
    getCompositionEntries(compositionId),
    listAllCards(),
    listSubjects(),
  ]);

  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const cardsWithPath = cards.map((c) => {
    const subject = subjectsById.get(c.subject_id);
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      subjectName: subject?.name ?? "?",
      subjectPath: subject ? pathFor(subjects, subject.id) : [],
    };
  });

  return (
    <CompositionBuilder
      composition={{
        id: composition.id,
        title: composition.title,
        subtitle: composition.subtitle,
        description: composition.description,
        kind: composition.kind,
      }}
      entries={entries.map((e) => ({
        id: e.id,
        position: e.position,
        kind: e.kind,
        cardId: e.card_id,
        cardTitle: e.card?.title ?? null,
        cardSlug: e.card?.slug ?? null,
        cardSubjectName:
          e.card && subjectsById.get(e.card.subject_id)?.name
            ? subjectsById.get(e.card.subject_id)!.name
            : null,
        headingLevel: e.heading_level,
        headingText: e.heading_text,
      }))}
      availableCards={cardsWithPath}
    />
  );
}
