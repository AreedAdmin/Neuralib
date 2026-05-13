import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Card = Tables<"cards">;
export type CardVersion = Tables<"card_versions">;

export const listCardsBySubject = cache(async (subjectId: string): Promise<Card[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("subject_id", subjectId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const listAllCards = cache(async (): Promise<Card[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getCard = cache(async (id: string): Promise<Card | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
});

export const getLatestVersion = cache(
  async (cardId: string): Promise<CardVersion | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("card_versions")
      .select("*")
      .eq("card_id", cardId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
);
