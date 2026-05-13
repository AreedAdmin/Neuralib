"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import type { Enums, TablesUpdate } from "@/lib/supabase/types";

async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { value?: undefined } : { value: T }))
  | { ok: false; error: string };

export async function createComposition(input: {
  title: string;
  kind?: Enums<"composition_kind">;
}): Promise<ActionResult<{ id: string }>> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };

  const { supabase, userId } = await getUserId();
  const baseSlug = slugify(title) || nanoid(6);

  for (const slug of [baseSlug, `${baseSlug}-${nanoid(4)}`]) {
    const { data, error } = await supabase
      .from("compositions")
      .insert({
        owner_id: userId,
        title,
        slug,
        kind: input.kind ?? "custom",
      })
      .select("id")
      .single();
    if (!error && data) {
      revalidatePath("/", "layout");
      return { ok: true, value: { id: data.id } };
    }
    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: "A composition with this slug already exists." };
}

export async function updateComposition(
  id: string,
  input: { title?: string; subtitle?: string; description?: string }
): Promise<ActionResult> {
  const { supabase } = await getUserId();
  const update: TablesUpdate<"compositions"> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Title cannot be empty." };
    update.title = title;
  }
  if (input.subtitle !== undefined) update.subtitle = input.subtitle.trim() || null;
  if (input.description !== undefined)
    update.description = input.description.trim() || null;

  const { error } = await supabase
    .from("compositions")
    .update(update)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteComposition(id: string): Promise<ActionResult> {
  const { supabase } = await getUserId();
  const { error } = await supabase.from("compositions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addEntry(input: {
  compositionId: string;
  cardId: string;
}): Promise<ActionResult> {
  const { supabase } = await getUserId();

  const { data: maxRow } = await supabase
    .from("composition_entries")
    .select("position")
    .eq("composition_id", input.compositionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = (maxRow?.position ?? -1) + 1;

  const { error } = await supabase.from("composition_entries").insert({
    composition_id: input.compositionId,
    position: nextPos,
    kind: "card",
    card_id: input.cardId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/compose/${input.compositionId}`);
  return { ok: true };
}

export async function removeEntry(entryId: string, compositionId: string): Promise<ActionResult> {
  const { supabase } = await getUserId();
  const { error } = await supabase
    .from("composition_entries")
    .delete()
    .eq("id", entryId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/compose/${compositionId}`);
  return { ok: true };
}

export async function reorderEntries(
  compositionId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const { supabase } = await getUserId();

  // Two-pass to avoid hitting the (composition_id, position) unique constraint:
  // first move everything to large negative positions, then restore final order.
  const negative = orderedIds.map((id, i) => ({ id, pos: -1000 - i }));
  for (const row of negative) {
    const { error } = await supabase
      .from("composition_entries")
      .update({ position: row.pos })
      .eq("id", row.id);
    if (error) return { ok: false, error: error.message };
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("composition_entries")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/compose/${compositionId}`);
  return { ok: true };
}
