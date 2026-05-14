import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { CHAT_MODEL, OLLAMA_BASE_URL } from "@/lib/ai/ollama";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Same Gemma-on-Ollama SSE shim as /api/assistant/chat — Ollama's OpenAI
// proxy emits the actual text under `delta.reasoning`, which the AI SDK
// ignores. Promote it back to `delta.content`.
const SSE_LINE_RE = /^data: (.+)$/gm;

async function rewriteReasoningAsContent(
  url: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") ?? "";
  if (!res.body || !ct.includes("text/event-stream")) return res;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffered = "";

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffered += decoder.decode(chunk, { stream: true });
      const lastNewline = buffered.lastIndexOf("\n");
      if (lastNewline === -1) return;
      const ready = buffered.slice(0, lastNewline + 1);
      buffered = buffered.slice(lastNewline + 1);

      const rewritten = ready.replace(SSE_LINE_RE, (line, json: string) => {
        if (json.trim() === "[DONE]") return line;
        try {
          const obj = JSON.parse(json);
          let touched = false;
          for (const choice of obj.choices ?? []) {
            const delta = choice.delta;
            if (
              delta &&
              typeof delta.reasoning === "string" &&
              delta.reasoning.length > 0 &&
              !delta.content
            ) {
              delta.content = delta.reasoning;
              delete delta.reasoning;
              touched = true;
            }
          }
          return touched ? `data: ${JSON.stringify(obj)}` : line;
        } catch {
          return line;
        }
      });
      controller.enqueue(encoder.encode(rewritten));
    },
    flush(controller) {
      if (buffered.length > 0) controller.enqueue(encoder.encode(buffered));
    },
  });

  return new Response(res.body.pipeThrough(transform), {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: `${OLLAMA_BASE_URL}/v1`,
  apiKey: "ollama",
  fetch: rewriteReasoningAsContent,
});

const SYSTEM_PROMPT = `You are an inline LaTeX assistant embedded inside ONE card of the user's Neurolib knowledge library.

You receive:
- CURRENT CARD: the full LaTeX content of the card being edited.
- SELECTED REGION (optional): a substring of the current card. When present, your output REPLACES this region.
- LINKED CONTEXT (optional): full text of cards this one links to. Treat as factual reference material.
- USER INSTRUCTION: what to produce.

# Output contract
- Return ONLY the LaTeX text to insert at the cursor (or replace the selection).
- NO prose. NO commentary. NO markdown code fences. NO "Here is the diagram:" preamble.
- Match surrounding style. The card is a latex_fragment unless it begins with \\documentclass — never add a documentclass.
- For diagrams, prefer TikZ wrapped in:
    \\begin{center}
      \\begin{tikzpicture}[<options>]
        ...
      \\end{tikzpicture}
    \\end{center}
  Assume the preamble already loads tikz libraries: positioning, arrows.meta, calc, shapes, decorations.pathreplacing, matrix, fit, backgrounds, trees.
- For math, prefer display environments (\\begin{equation}, \\begin{align*}) when the instruction implies standalone math, or inline $...$ when the instruction is a small substitution inside flowing text.
- For rewrites/edits when SELECTED REGION is non-empty, produce a drop-in replacement of that region only — do not repeat the rest of the card.
- If the user asks for something that doesn't make sense, return a single LaTeX comment line: \`% inline-ai: <one-line reason>\`.`;

type Body = {
  cardId?: string;
  selectionText?: string;
  prompt?: string;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const cardId = body.cardId?.trim();
  const prompt = body.prompt?.trim();
  const selectionText = body.selectionText ?? "";
  if (!cardId || !prompt) {
    return NextResponse.json(
      { error: "cardId and prompt are required." },
      { status: 400 }
    );
  }

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .select("id, title, content")
    .eq("id", cardId)
    .maybeSingle();
  if (cardErr) {
    return NextResponse.json({ error: cardErr.message }, { status: 500 });
  }
  if (!card) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  const { data: outgoing } = await supabase
    .from("card_links")
    .select(
      "kind, note, target:cards!card_links_target_card_id_fkey(id, title, content)"
    )
    .eq("source_card_id", cardId);

  const linkedBlocks = (outgoing ?? [])
    .flatMap((row) => {
      const target = row.target;
      if (!target) return [];
      const kindLabel = row.kind ? ` (${row.kind})` : "";
      const noteLabel = row.note ? `\n_note: ${row.note}_` : "";
      return [
        `## ${target.title}${kindLabel}${noteLabel}\n\n\`\`\`latex\n${target.content}\n\`\`\``,
      ];
    })
    .join("\n\n---\n\n");

  const userPrompt = [
    `# CURRENT CARD — "${card.title}"`,
    "```latex",
    card.content,
    "```",
    selectionText
      ? `\n# SELECTED REGION (your output REPLACES this)\n\`\`\`latex\n${selectionText}\n\`\`\``
      : "",
    linkedBlocks ? `\n# LINKED CONTEXT\n\n${linkedBlocks}` : "",
    `\n# USER INSTRUCTION\n${prompt}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = streamText({
    model: ollama(CHAT_MODEL),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  return result.toTextStreamResponse({
    headers: {
      "Cache-Control": "no-cache, no-store, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
