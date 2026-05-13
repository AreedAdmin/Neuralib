"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SUBJECT_PALETTE = [
  "var(--color-subject-1)",
  "var(--color-subject-2)",
  "var(--color-subject-3)",
  "var(--color-subject-4)",
  "var(--color-subject-5)",
  "var(--color-subject-6)",
  "var(--color-subject-7)",
  "var(--color-subject-8)",
];

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { value?: undefined } : { value: T }))
  | { ok: false; error: string };

async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

/**
 * Create or look-up a tag by name (per-owner unique). Idempotent for the same name.
 */
export async function ensureTag(name: string): Promise<ActionResult<{ id: string; name: string; color: string | null }>> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Tag name is required." };
  const { supabase, userId } = await getUserId();

  // existing?
  const { data: existing } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("name", trimmed)
    .maybeSingle();
  if (existing) return { ok: true, value: existing };

  // pick a stable color from the palette based on a string hash
  let h = 0;
  for (let i = 0; i < trimmed.length; i++) h = (h * 31 + trimmed.charCodeAt(i)) | 0;
  const color = SUBJECT_PALETTE[Math.abs(h) % SUBJECT_PALETTE.length];

  const { data, error } = await supabase
    .from("tags")
    .insert({ owner_id: userId, name: trimmed, color })
    .select("id, name, color")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };
  revalidatePath("/", "layout");
  return { ok: true, value: data };
}

export async function attachTagToCard(input: {
  cardId: string;
  tagName: string;
}): Promise<ActionResult> {
  const ensured = await ensureTag(input.tagName);
  if (!ensured.ok) return ensured;

  const { supabase } = await getUserId();
  const { error } = await supabase
    .from("card_tags")
    .insert({ card_id: input.cardId, tag_id: ensured.value.id });
  if (error && error.code !== "23505") {
    return { ok: false, error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function detachTagFromCard(input: {
  cardId: string;
  tagId: string;
}): Promise<ActionResult> {
  const { supabase } = await getUserId();
  const { error } = await supabase
    .from("card_tags")
    .delete()
    .eq("card_id", input.cardId)
    .eq("tag_id", input.tagId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
