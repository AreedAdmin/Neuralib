import type { UIMessage } from "ai";
import { notFound } from "next/navigation";
import { Chat } from "@/components/assistant/Chat";
import { getThread, listMessages, type Message } from "@/lib/db/threads";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const thread = await getThread(threadId);
  if (!thread) notFound();

  const rows = await listMessages(threadId);
  const initialMessages = hydrateMessages(rows);

  return <Chat threadId={threadId} initialMessages={initialMessages} />;
}

/**
 * Convert persisted assistant_messages rows back into the AI SDK's UIMessage
 * shape. v1: only text parts are reconstructed — historical tool invocations
 * collapse to a JSON string in their text. The live flow renders proposals
 * properly; reload-rehydration of tool cards is a polish-pass concern.
 */
function hydrateMessages(rows: Message[]): UIMessage[] {
  const out: UIMessage[] = [];
  for (const row of rows) {
    if (row.role === "system" || row.role === "tool") continue; // tools are reconstructed implicitly when assistant references them
    out.push({
      id: row.id,
      role: row.role as "user" | "assistant",
      content: row.content,
      parts: [{ type: "text", text: row.content }],
    });
  }
  return out;
}
