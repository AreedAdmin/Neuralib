"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHAT_MODEL } from "@/lib/ai/ollama";

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
 * Insert a thread row. Used by both the render-time entry (/assistant landing
 * page) and explicit "New chat" buttons. revalidatePath is intentionally
 * omitted here because /assistant calls this during render, and Next 15
 * disallows revalidatePath from a render path. Callers that mutate from a
 * click should call the wrapper below.
 */
async function insertThread(title?: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, userId } = await getUserId();
  const { data, error } = await supabase
    .from("assistant_threads")
    .insert({
      owner_id: userId,
      title: title?.trim() || null,
      model: CHAT_MODEL,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };
  return { ok: true, value: { id: data.id } };
}

/** Render-safe: no revalidatePath. Call from server components / pages. */
export async function createThread(title?: string) {
  return insertThread(title);
}

/** Mutation variant: revalidates the layout so the sidebar reflects the new thread. */
export async function createThreadAndRevalidate(title?: string) {
  const res = await insertThread(title);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function renameThread(
  id: string,
  title: string
): Promise<ActionResult> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };
  const { supabase } = await getUserId();
  const { error } = await supabase
    .from("assistant_threads")
    .update({ title: trimmed })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteThread(id: string): Promise<ActionResult> {
  const { supabase } = await getUserId();
  const { error } = await supabase.from("assistant_threads").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
