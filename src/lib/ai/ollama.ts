/**
 * Tiny wrapper over the local Ollama HTTP API.
 *
 * The Next.js server is the only thing that talks to Ollama; the browser never
 * does. Configurable via env vars so flipping models doesn't require a code
 * change.
 */
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
