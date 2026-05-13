import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Composition = Tables<"compositions">;
export type CompositionEntry = Tables<"composition_entries">;

export type CompositionEntryWithCard = CompositionEntry & {
  card: {
    id: string;
    title: string;
    slug: string;
    content: string;
    format: Tables<"cards">["format"];
    subject_id: string;
  } | null;
};

export const listCompositions = cache(
  async (): Promise<Composition[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("compositions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
);

export const getComposition = cache(
  async (id: string): Promise<Composition | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("compositions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
);

export const getCompositionEntries = cache(
  async (compositionId: string): Promise<CompositionEntryWithCard[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("composition_entries")
      .select(
        "id, composition_id, position, kind, card_id, heading_level, heading_text, raw_content, card:cards(id, title, slug, content, format, subject_id)"
      )
      .eq("composition_id", compositionId)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CompositionEntryWithCard[];
  }
);
