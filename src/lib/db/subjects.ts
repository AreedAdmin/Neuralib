import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Subject = Tables<"subjects">;

export type SubjectNode = Subject & {
  children: SubjectNode[];
};

/** Fetch every subject for the current user, flat. Cached per-request. */
export const listSubjects = cache(async (): Promise<Subject[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
});

/** Build a tree of subjects from a flat list. Pure function. */
export function buildSubjectTree(subjects: Subject[]): SubjectNode[] {
  const byId = new Map<string, SubjectNode>();
  for (const s of subjects) byId.set(s.id, { ...s, children: [] });

  const roots: SubjectNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** Resolve a slug path like ['algorithms', 'graph-algorithms'] to the leaf subject. */
export function findSubjectByPath(
  roots: SubjectNode[],
  path: string[]
): SubjectNode | null {
  let current: SubjectNode | undefined;
  let pool = roots;
  for (const slug of path) {
    current = pool.find((n) => n.slug === slug);
    if (!current) return null;
    pool = current.children;
  }
  return current ?? null;
}

/** Build the slug-path for a subject by walking up the parent chain. */
export function pathFor(subjects: Subject[], leafId: string): string[] {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const out: string[] = [];
  let cur = byId.get(leafId);
  while (cur) {
    out.unshift(cur.slug);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return out;
}
