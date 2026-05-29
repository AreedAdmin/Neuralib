import { streamText } from "ai";
import { NextResponse } from "next/server";
import { CHAT_MODEL, ollamaProvider } from "@/lib/ai/ollama";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

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
    model: ollamaProvider(CHAT_MODEL),
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
