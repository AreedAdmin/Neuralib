import { createClient } from "@/lib/supabase/server";
import { listSubjects, pathFor, type Subject } from "@/lib/db/subjects";

export type SearchHit = {
  id: string;
  title: string;
  summary: string | null;
  subjectId: string;
  subjectName: string;
  subjectPath: string[];
  rank: number;
  snippet: string;
};

export async function searchCards(
  q: string,
  lim: number = 25
): Promise<SearchHit[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_cards", {
    q: trimmed,
    lim,
  });

  if (error) {
    console.error("search_cards rpc error:", error);
    return [];
  }
  if (!data) return [];

  const subjects = await listSubjects();
  const byId = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  return data.map((row) => {
    const subject = byId.get(row.subject_id);
    const subjectPath = subject ? pathFor(subjects, subject.id) : [];
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      subjectId: row.subject_id,
      subjectName: subject?.name ?? "?",
      subjectPath,
      rank: row.rank,
      snippet: row.snippet,
    };
  });
}

/** For the /search?debug=1 view — also pulls each hit's stripped plain text. */
export async function searchCardsWithDebug(
  q: string,
  lim: number = 25
): Promise<Array<SearchHit & { contentPlain: string }>> {
  const hits = await searchCards(q, lim);
  if (hits.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("cards")
    .select("id, content_plain")
    .in(
      "id",
      hits.map((h) => h.id)
    );

  const plainById = new Map<string, string>(
    data?.map((c) => [c.id, c.content_plain ?? ""]) ?? []
  );
  return hits.map((h) => ({ ...h, contentPlain: plainById.get(h.id) ?? "" }));
}
