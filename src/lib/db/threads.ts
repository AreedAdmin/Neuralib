import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Thread = Tables<"assistant_threads">;
export type Message = Tables<"assistant_messages">;

export const listThreads = cache(async (): Promise<Thread[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistant_threads")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
});

export async function getThread(id: string): Promise<Thread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistant_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMessages(threadId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
