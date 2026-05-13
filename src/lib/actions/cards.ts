"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { upsertCardEmbedding } from "@/lib/ai/embed";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import type { TablesUpdate } from "@/lib/supabase/types";

/**
 * Embed a card after a write. Failures (Ollama down, model not loaded, etc.)
 * are logged but never fail the user-facing action — the backfill route can
 * mop up later.
 */
async function reembed(cardId: string, ownerId: string, contentPlain: string) {
  try {
    const result = await upsertCardEmbedding({ cardId, ownerId, contentPlain });
    if (result.kind === "failed") {
      console.warn(`embed: card ${cardId} failed:`, result.error);
    }
  } catch (err) {
    console.warn(`embed: card ${cardId} threw:`, err);
  }
}

const VERSION_GAP_MS = 5 * 60 * 1000; // snapshot at most every 5 min ...
const VERSION_DELTA_CHARS = 200; // ... unless the change is large

async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { id?: undefined } : { value: T }))
  | { ok: false; error: string };

export async function createCard(input: {
  subjectId: string;
  title: string;
  content?: string;
  format?: "latex_fragment" | "latex_doc";
}): Promise<ActionResult<{ id: string }>> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };

  const { supabase, userId } = await getUserId();
  const baseSlug = slugify(title) || nanoid(6);
  const content = input.content ?? starterContent(title);
  const format = input.format ?? "latex_fragment";

  for (const slug of [baseSlug, `${baseSlug}-${nanoid(4)}`]) {
    const { data, error } = await supabase
      .from("cards")
      .insert({
        owner_id: userId,
        subject_id: input.subjectId,
        title,
        slug,
        format,
        content,
      })
      .select("id, content_plain")
      .single();

    if (!error && data) {
      await reembed(data.id, userId, data.content_plain ?? "");
      revalidatePath("/", "layout");
      return { ok: true, value: { id: data.id } };
    }
    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: "A card with this slug already exists in this subject." };
}

export async function autosaveCard(input: {
  id: string;
  content: string;
  title?: string;
  summary?: string;
}): Promise<ActionResult<{ savedAt: string; versionCreated: boolean }>> {
  const { supabase } = await getUserId();

  // load latest version metadata to decide whether to snapshot
  const { data: prev } = await supabase
    .from("card_versions")
    .select("version, content, created_at")
    .eq("card_id", input.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = Date.now();
  const lastVersion = prev?.version ?? 0;
  const lastContent = prev?.content ?? "";
  const lastCreatedAt = prev ? new Date(prev.created_at).getTime() : 0;
  const delta = Math.abs(input.content.length - lastContent.length);
  const elapsed = now - lastCreatedAt;
  const shouldSnapshot =
    input.content !== lastContent &&
    (elapsed >= VERSION_GAP_MS || delta >= VERSION_DELTA_CHARS || lastVersion === 0);

  const updates: TablesUpdate<"cards"> = { content: input.content };
  if (input.title !== undefined) updates.title = input.title;
  if (input.summary !== undefined) updates.summary = input.summary;

  const { data: updated, error: updateError } = await supabase
    .from("cards")
    .update(updates)
    .eq("id", input.id)
    .select("updated_at, format, owner_id, content_plain")
    .single();

  if (updateError || !updated) {
    return { ok: false, error: updateError?.message ?? "Update failed." };
  }

  let versionCreated = false;
  if (shouldSnapshot) {
    const { error: versionError } = await supabase.from("card_versions").insert({
      card_id: input.id,
      version: lastVersion + 1,
      content: input.content,
      format: updated.format,
    });
    versionCreated = !versionError;
  }

  await reembed(input.id, updated.owner_id, updated.content_plain ?? "");

  return {
    ok: true,
    value: { savedAt: updated.updated_at, versionCreated },
  };
}

export async function deleteCard(id: string): Promise<ActionResult> {
  const { supabase } = await getUserId();
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

function starterContent(title: string): string {
  return `\\section*{${title}}

\\begin{tikzpicture}
  % your diagram here
\\end{tikzpicture}

% Notes:
`;
}
