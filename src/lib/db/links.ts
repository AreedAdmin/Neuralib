import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type LinkKind = Tables<"card_links">["kind"];

export type LinkedCard = {
  linkId: string;
  kind: LinkKind;
  note: string | null;
  card: {
    id: string;
    title: string;
    slug: string;
    subjectId: string;
  };
};

export async function listLinksForCard(cardId: string): Promise<{
  outgoing: LinkedCard[];
  incoming: LinkedCard[];
}> {
  const supabase = await createClient();

  const [outgoingRes, incomingRes] = await Promise.all([
    supabase
      .from("card_links")
      .select(
        "id, kind, note, target:cards!card_links_target_card_id_fkey(id, title, slug, subject_id)"
      )
      .eq("source_card_id", cardId),
    supabase
      .from("card_links")
      .select(
        "id, kind, note, source:cards!card_links_source_card_id_fkey(id, title, slug, subject_id)"
      )
      .eq("target_card_id", cardId),
  ]);

  if (outgoingRes.error) throw outgoingRes.error;
  if (incomingRes.error) throw incomingRes.error;

  const outgoing: LinkedCard[] = (outgoingRes.data ?? [])
    .filter((row) => row.target)
    .map((row) => ({
      linkId: row.id,
      kind: row.kind,
      note: row.note,
      card: {
        id: row.target!.id,
        title: row.target!.title,
        slug: row.target!.slug,
        subjectId: row.target!.subject_id,
      },
    }));

  const incoming: LinkedCard[] = (incomingRes.data ?? [])
    .filter((row) => row.source)
    .map((row) => ({
      linkId: row.id,
      kind: row.kind,
      note: row.note,
      card: {
        id: row.source!.id,
        title: row.source!.title,
        slug: row.source!.slug,
        subjectId: row.source!.subject_id,
      },
    }));

  return { outgoing, incoming };
}
