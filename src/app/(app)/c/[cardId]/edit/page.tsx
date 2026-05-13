import { notFound, redirect } from "next/navigation";
import { CardWorkspace } from "@/components/editor/CardWorkspace";
import { getCard, listAllCards } from "@/lib/db/cards";
import { listLinksForCard } from "@/lib/db/links";
import {
  buildSubjectTree,
  findSubjectByPath,
  listSubjects,
  pathFor,
} from "@/lib/db/subjects";
import { listTags, listTagsForCard } from "@/lib/db/tags";

export default async function CardEditPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  const card = await getCard(cardId);
  if (!card) notFound();

  const [subjects, links, allTags, cardTags, allCards] = await Promise.all([
    listSubjects(),
    listLinksForCard(cardId),
    listTags(),
    listTagsForCard(cardId),
    listAllCards(),
  ]);
  const subjectPath = pathFor(subjects, card.subject_id);
  const tree = buildSubjectTree(subjects);
  const subject = findSubjectByPath(tree, subjectPath);
  if (!subject) redirect("/");

  const subjectsById = new Map(subjects.map((s) => [s.id, s]));

  return (
    <CardWorkspace
      initial={{
        id: card.id,
        title: card.title,
        summary: card.summary,
        content: card.content,
        format: card.format,
        updatedAt: card.updated_at,
      }}
      subject={{
        name: subject.name,
        path: subjectPath,
      }}
      tags={{
        own: cardTags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
        available: allTags.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
        })),
      }}
      links={{
        outgoing: links.outgoing,
        incoming: links.incoming,
        availableCards: allCards
          .filter((c) => c.id !== card.id)
          .map((c) => ({
            id: c.id,
            title: c.title,
            subjectName: subjectsById.get(c.subject_id)?.name ?? "",
          })),
      }}
    />
  );
}
