"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase };
}

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createLink(input: {
  sourceCardId: string;
  targetCardId: string;
  kind: Enums<"link_kind">;
  note?: string;
}): Promise<ActionResult> {
  if (input.sourceCardId === input.targetCardId) {
    return { ok: false, error: "A card can't link to itself." };
  }
  const { supabase } = await getUserId();
  const { error } = await supabase.from("card_links").insert({
    source_card_id: input.sourceCardId,
    target_card_id: input.targetCardId,
    kind: input.kind,
    note: input.note ?? null,
  });
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "That link already exists." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteLink(linkId: string): Promise<ActionResult> {
  const { supabase } = await getUserId();
  const { error } = await supabase.from("card_links").delete().eq("id", linkId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
