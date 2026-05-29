/**
 * Tiny wrapper over the local Ollama HTTP API.
 *
 * The Next.js server is the only thing that talks to Ollama; the browser never
 * does. Configurable via env vars so flipping models doesn't require a code
 * change.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";

export const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "gemma4:31b";
export const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export type OllamaTagsResponse = {
  models: Array<{
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details?: {
      family?: string;
      parameter_size?: string;
      quantization_level?: string;
    };
  }>;
};

/** GET /api/tags — list installed models. */
export async function listLocalModels(): Promise<OllamaTagsResponse | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as OllamaTagsResponse;
  } catch {
    return null;
  }
}

/** POST /api/embeddings — generate a single embedding. */
export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ollama embed failed (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as { embedding: number[] };
  return json.embedding;
}

export const OLLAMA_BASE_URL = OLLAMA_BASE;

// ---------------------------------------------------------------------------
// Shared AI-SDK provider
// ---------------------------------------------------------------------------
// Use Ollama's OpenAI-compatible endpoint (/v1) instead of the dedicated
// ollama-ai-provider, which silently drops Gemma's tool calls.
//
// Gemma quirk: every streamed chunk arrives with `delta.content === ""` and the
// real text in `delta.reasoning`. The AI SDK only watches `content`, so without
// the rewrite stream below the UI sees nothing until the final burst. Promote
// `reasoning` back into `content`. Shared by the chat / inline / autotab routes.
const SSE_LINE_RE = /^data: (.+)$/gm;

async function rewriteReasoningAsContent(
  url: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") ?? "";
  if (!res.body || !ct.includes("text/event-stream")) {
    return res;
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  // Buffer partial SSE lines across chunk boundaries.
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
      if (buffered.length > 0) {
        controller.enqueue(encoder.encode(buffered));
        buffered = "";
      }
    },
  });

  return new Response(res.body.pipeThrough(transform), {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

/** Shared AI-SDK model factory for the Ollama OpenAI-compatible endpoint. */
export const ollamaProvider = createOpenAICompatible({
  name: "ollama",
  baseURL: `${OLLAMA_BASE_URL}/v1`,
  apiKey: "ollama",
  fetch: rewriteReasoningAsContent,
});
