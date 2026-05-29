import { streamText } from "ai";
import { NextResponse } from "next/server";
import { CHAT_MODEL, ollamaProvider } from "@/lib/ai/ollama";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Autotab uses a dedicated (usually smaller/faster) model when configured,
// falling back to the main chat model.
const AUTOTAB_MODEL = process.env.OLLAMA_AUTOCOMPLETE_MODEL ?? CHAT_MODEL;

const SYSTEM_PROMPT = `You are a LaTeX autocomplete engine embedded in a code editor — like Copilot/Cursor Tab, but for LaTeX.

You receive the document split at the cursor:
- <PREFIX> is the text immediately BEFORE the cursor.
- <SUFFIX> is the text immediately AFTER the cursor.

Your job: predict the single most likely continuation that should be inserted AT the cursor, so that PREFIX + YOUR_OUTPUT + SUFFIX reads naturally.

# Hard rules
- Output ONLY the raw text to insert. No prose, no explanation, no markdown fences, no "Here is".
- Do NOT repeat any text from PREFIX or SUFFIX. Emit only the new characters.
- Keep it SHORT: finish the current word/command/line, or at most complete a small local structure (e.g. close an environment, finish an equation). Never write more than ~2 lines.
- Respect what SUFFIX already provides — do not duplicate a closing brace/environment that already follows the cursor.
- If no useful continuation exists (cursor is at a natural stopping point), output an empty string.
- This is a latex_fragment: never emit \\documentclass or a full preamble.`;

type Body = {
  prefix?: string;
  suffix?: string;
};

const MAX_PREFIX = 2000;
const MAX_SUFFIX = 600;

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

  // Keep only the local window around the cursor — autocomplete latency matters
  // far more than full-document context here.
  const prefix = (body.prefix ?? "").slice(-MAX_PREFIX);
  const suffix = (body.suffix ?? "").slice(0, MAX_SUFFIX);
  if (!prefix.trim() && !suffix.trim()) {
    return new Response("", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const userPrompt = `<PREFIX>\n${prefix}\n</PREFIX>\n<SUFFIX>\n${suffix}\n</SUFFIX>`;

  const result = streamText({
    model: ollamaProvider(AUTOTAB_MODEL),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.1,
    maxTokens: 96,
  });

  return result.toTextStreamResponse({
    headers: {
      "Cache-Control": "no-cache, no-store, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
