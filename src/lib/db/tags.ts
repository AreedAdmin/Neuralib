import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Tag = Tables<"tags">;

export const listTags = cache(async (): Promise<Tag[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
});

export async function listTagsForCard(cardId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_tags")
    .select("tag:tags(*)")
    .eq("card_id", cardId);
  if (error) throw error;
  return ((data ?? [])
    .map((row) => row.tag)
    .filter((t): t is Tag => Boolean(t)) ?? []);
}
