import { createHash } from "node:crypto";
import { EMBED_MODEL, embed } from "@/lib/ai/ollama";
import { createClient } from "@/lib/supabase/server";

/** Content-plain hash. The trigger keeps `content_plain` in sync with `content`. */
export function contentPlainHash(contentPlain: string): string {
  return createHash("sha256").update(contentPlain).digest("hex");
}

export type EmbeddingResult =
  | { kind: "skipped"; reason: "unchanged" | "empty" }
  | { kind: "updated"; sourceHash: string }
  | { kind: "failed"; error: string };

/**
 * Upsert a card's embedding if (and only if) its content_plain hash differs
 * from the row already on disk. No-ops when:
 *  - content_plain is empty (nothing to embed)
 *  - source_hash already matches
 * Returns a discriminated result so callers can log without rethrowing.
 */
export async function upsertCardEmbedding(input: {
  cardId: string;
  ownerId: string;
  contentPlain: string;
}): Promise<EmbeddingResult> {
  const trimmed = input.contentPlain.trim();
  if (!trimmed) return { kind: "skipped", reason: "empty" };

  const hash = contentPlainHash(input.contentPlain);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("card_embeddings")
    .select("source_hash")
    .eq("card_id", input.cardId)
    .maybeSingle();

  if (existing?.source_hash === hash) {
    return { kind: "skipped", reason: "unchanged" };
  }

  let vector: number[];
  try {
    vector = await embed(input.contentPlain);
  } catch (err) {
    return {
      kind: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // pgvector accepts the bracketed string form via Postgrest reliably across
  // supabase-js versions; bare-array also works but stringifying is safer.
  const vectorLiteral = `[${vector.join(",")}]`;

  const { error } = await supabase.from("card_embeddings").upsert(
    {
      card_id: input.cardId,
      owner_id: input.ownerId,
      embedding: vectorLiteral as unknown as string,
      model: EMBED_MODEL,
      source_hash: hash,
    },
    { onConflict: "card_id" }
  );

  if (error) return { kind: "failed", error: error.message };
  return { kind: "updated", sourceHash: hash };
}

/** Embed a free-text query (used by the chat assistant for retrieval). */
export async function embedQuery(text: string): Promise<number[]> {
  return embed(text);
}
