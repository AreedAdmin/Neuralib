import { convertToCoreMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { CHAT_MODEL, ollamaProvider } from "@/lib/ai/ollama";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { tools } from "@/lib/ai/tools";
import { createClient } from "@/lib/supabase/server";

type AppSupabase = Awaited<ReturnType<typeof createClient>>;

export const runtime = "nodejs";
export const maxDuration = 300;
// Force dynamic so Next.js never tries to cache or buffer the streaming body.
export const dynamic = "force-dynamic";

type ReqBody = {
  messages?: UIMessage[];
  threadId?: string;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const messages = body.messages ?? [];
  const threadId = body.threadId;
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "messages must be a non-empty array." },
      { status: 400 }
    );
  }

  // Persist the user's latest message before streaming.
  if (threadId) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      await appendMessage(supabase, threadId, {
        role: "user",
        content:
          typeof lastUser.content === "string"
            ? lastUser.content
            : JSON.stringify(lastUser.content ?? ""),
      });
    }
  }

  const t0 = Date.now();
  let firstChunkAt: number | null = null;

  const result = streamText({
    model: ollamaProvider(CHAT_MODEL),
    system: SYSTEM_PROMPT,
    messages: convertToCoreMessages(messages),
    tools,
    // 3 is enough for one read-tool round-trip in v1; bump if we ever need
    // chained reads. Keeping it tight reduces extra inference rounds.
    maxSteps: 3,
    // Stream tool-call deltas (now that we're on the OpenAI-compatible
    // provider that handles the protocol correctly).
    experimental_toolCallStreaming: true,
    onChunk({ chunk }) {
      if (firstChunkAt === null) {
        firstChunkAt = Date.now();
        console.log(
          `[assistant chat] first chunk in ${firstChunkAt - t0}ms (type=${chunk.type})`
        );
      }
    },
    onError({ error }) {
      console.error("[assistant chat] streamText error:", error);
    },
    onFinish: async ({ response, finishReason, usage }) => {
      const elapsed = Date.now() - t0;
      const tps =
        usage?.completionTokens && firstChunkAt
          ? (usage.completionTokens / ((Date.now() - firstChunkAt) / 1000)).toFixed(1)
          : "?";
      console.log(
        `[assistant chat] finish — ${elapsed}ms total · ${tps} tok/s · ` +
          `reason=${finishReason} prompt=${usage?.promptTokens ?? "?"} ` +
          `completion=${usage?.completionTokens ?? "?"} messages=${response.messages.length}`
      );
      for (const m of response.messages) {
        const preview =
          typeof m.content === "string"
            ? m.content.slice(0, 100)
            : JSON.stringify(m.content).slice(0, 200);
        console.log(`  [${m.role}] ${preview}`);
      }
      if (!threadId) return;
      // response.messages is the canonical CoreMessage[] for this turn —
      // assistant text, tool calls, tool results, all in order.
      for (const msg of response.messages) {
        const content =
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content);
        await appendMessage(supabase, threadId, {
          role: msg.role,
          content,
          tool_calls:
            msg.role === "assistant" && Array.isArray(msg.content)
              ? (msg.content.filter(
                  (p) => (p as { type?: string }).type === "tool-call"
                ) as unknown as object[])
              : null,
          tool_call_id:
            msg.role === "tool" && Array.isArray(msg.content)
              ? ((msg.content[0] as { toolCallId?: string }).toolCallId ?? null)
              : null,
        });
      }
      // Touch the thread so the sidebar list re-orders by recency.
      await supabase
        .from("assistant_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);
    },
  });

  // Stream the response back. The headers below disable any reverse-proxy
  // buffering (nginx etc.) and prevent caching layers from holding chunks. In
  // dev with Turbopack these are belt-and-braces; in prod behind a CDN they're
  // mandatory for SSE to feel real-time.
  return result.toDataStreamResponse({
    headers: {
      "Cache-Control": "no-cache, no-store, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function appendMessage(
  supabase: AppSupabase,
  threadId: string,
  msg: {
    role: "user" | "assistant" | "tool" | "system";
    content: string;
    tool_calls?: object[] | null;
    tool_call_id?: string | null;
  }
) {
  const { data: maxRow } = await supabase
    .from("assistant_messages")
    .select("position")
    .eq("thread_id", threadId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((maxRow?.position as number | undefined) ?? -1) + 1;
  await supabase.from("assistant_messages").insert({
    thread_id: threadId,
    position: nextPos,
    role: msg.role,
    content: msg.content,
    tool_calls: (msg.tool_calls ?? null) as unknown as never,
    tool_call_id: msg.tool_call_id ?? null,
  });
}
