"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createSubject(input: {
  name: string;
  parentId: string | null;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const { supabase, userId } = await getUserId();
  const baseSlug = slugify(name) || nanoid(6);

  // try base slug, then base-suffix on unique-violation
  for (const slug of [baseSlug, `${baseSlug}-${nanoid(4)}`]) {
    const { error } = await supabase.from("subjects").insert({
      owner_id: userId,
      parent_id: input.parentId,
      name,
      slug,
    });
    if (!error) {
      revalidatePath("/", "layout");
      return { ok: true };
    }
    if (error.code !== "23505") {
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: "A subject with this slug already exists. Try a different name." };
}

export async function renameSubject(id: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };

  const { supabase } = await getUserId();
  const slug = slugify(trimmed) || nanoid(6);
  const { error } = await supabase
    .from("subjects")
    .update({ name: trimmed, slug })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const { supabase } = await getUserId();
  const { error } = await supabase.from("subjects").delete().eq("id", id);

  if (error) {
    // FK ON DELETE RESTRICT from cards.subject_id will fire if cards exist
    if (error.code === "23503") {
      return { ok: false, error: "This subject still has cards. Move or delete them first." };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
