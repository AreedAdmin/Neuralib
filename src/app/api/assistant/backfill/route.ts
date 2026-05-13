import { NextResponse } from "next/server";
import { contentPlainHash, upsertCardEmbedding } from "@/lib/ai/embed";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PARALLELISM = 4;

type BackfillResponse = {
  ok: boolean;
  total: number;
  alreadyUpToDate: number;
  updated: number;
  empty: number;
  failed: number;
  errors: Array<{ cardId: string; error: string }>;
  hint?: string;
};

/**
 * POST /api/assistant/backfill — embed every owned card whose source_hash
 * doesn't match its current content_plain.
 *
 * Triggered manually (button in the assistant UI later, or just curl while
 * logged in). Single-user; RLS scopes to the caller. Runs cards in batches of
 * PARALLELISM to keep Ollama responsive.
 */
export async function POST(): Promise<NextResponse<BackfillResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        total: 0,
        alreadyUpToDate: 0,
        updated: 0,
        empty: 0,
        failed: 0,
        errors: [],
        hint: "Sign in required.",
      },
      { status: 401 }
    );
  }

  // Pull every card with its content_plain alongside the existing embedding
  // hash (if any). One query, no N+1.
  const { data: rows, error } = await supabase
    .from("cards")
    .select("id, owner_id, content_plain, card_embeddings(source_hash)")
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        total: 0,
        alreadyUpToDate: 0,
        updated: 0,
        empty: 0,
        failed: 0,
        errors: [],
        hint: error.message,
      },
      { status: 500 }
    );
  }

  type Row = {
    id: string;
    owner_id: string;
    content_plain: string;
    card_embeddings: { source_hash: string } | { source_hash: string }[] | null;
  };
  const cards = (rows ?? []) as unknown as Row[];

  const summary: BackfillResponse = {
    ok: true,
    total: cards.length,
    alreadyUpToDate: 0,
    updated: 0,
    empty: 0,
    failed: 0,
    errors: [],
  };

  // Pre-filter: cards that already match their current content_plain hash
  const todo: Row[] = [];
  for (const card of cards) {
    const plain = card.content_plain ?? "";
    if (!plain.trim()) {
      summary.empty += 1;
      continue;
    }
    const existing = Array.isArray(card.card_embeddings)
      ? card.card_embeddings[0]
      : card.card_embeddings;
    if (existing?.source_hash === contentPlainHash(plain)) {
      summary.alreadyUpToDate += 1;
      continue;
    }
    todo.push(card);
  }

  // Embed in chunks of PARALLELISM
  for (let i = 0; i < todo.length; i += PARALLELISM) {
    const batch = todo.slice(i, i + PARALLELISM);
    const results = await Promise.all(
      batch.map((card) =>
        upsertCardEmbedding({
          cardId: card.id,
          ownerId: card.owner_id,
          contentPlain: card.content_plain,
        }).then((r) => ({ cardId: card.id, result: r }))
      )
    );
    for (const { cardId, result } of results) {
      if (result.kind === "updated") {
        summary.updated += 1;
      } else if (result.kind === "skipped") {
        // possible if content was edited mid-backfill; treat as up-to-date
        summary.alreadyUpToDate += 1;
      } else {
        summary.failed += 1;
        summary.errors.push({ cardId, error: result.error });
      }
    }
  }

  if (summary.failed > 0 && summary.updated === 0) {
    summary.ok = false;
    summary.hint = "All embedding attempts failed. Is Ollama running?";
  }

  return NextResponse.json(summary);
}
