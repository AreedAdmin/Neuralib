import { NextResponse } from "next/server";
import { CHAT_MODEL, EMBED_MODEL, listLocalModels } from "@/lib/ai/ollama";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type HealthResponse = {
  ok: boolean;
  ollama: {
    reachable: boolean;
    chatModel: { name: string; present: boolean };
    embedModel: { name: string; present: boolean };
    installedCount: number;
  };
  embeddings: {
    tableReady: boolean;
    coverage: { total: number; embedded: number };
  };
  hint?: string;
};

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        ollama: {
          reachable: false,
          chatModel: { name: CHAT_MODEL, present: false },
          embedModel: { name: EMBED_MODEL, present: false },
          installedCount: 0,
        },
        embeddings: { tableReady: false, coverage: { total: 0, embedded: 0 } },
        hint: "Sign in required.",
      },
      { status: 401 }
    );
  }

  const tags = await listLocalModels();
  const reachable = !!tags;
  const installedNames = new Set((tags?.models ?? []).map((m) => m.name));

  // Touch card_embeddings — its existence implicitly proves pgvector is loaded
  // (the migration creates a vector(768) column; without the extension, the
  // table couldn't exist at all).
  const tableProbe = await supabase
    .from("card_embeddings")
    .select("card_id", { count: "exact", head: true });

  const totalCards = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true });

  const body: HealthResponse = {
    ok:
      reachable &&
      installedNames.has(CHAT_MODEL) &&
      installedNames.has(EMBED_MODEL) &&
      !tableProbe.error,
    ollama: {
      reachable,
      chatModel: { name: CHAT_MODEL, present: installedNames.has(CHAT_MODEL) },
      embedModel: { name: EMBED_MODEL, present: installedNames.has(EMBED_MODEL) },
      installedCount: tags?.models?.length ?? 0,
    },
    embeddings: {
      tableReady: !tableProbe.error,
      coverage: {
        total: totalCards.count ?? 0,
        embedded: tableProbe.count ?? 0,
      },
    },
  };

  if (!reachable) {
    body.hint =
      "Ollama daemon is not reachable on " +
      (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434") +
      ". Start it with `ollama serve` (or `~/.local/bin/ollama serve` if it's not on PATH).";
  } else if (!body.ollama.chatModel.present) {
    body.hint = `Run: ollama pull ${CHAT_MODEL}`;
  } else if (!body.ollama.embedModel.present) {
    body.hint = `Run: ollama pull ${EMBED_MODEL}`;
  } else if (!body.embeddings.tableReady) {
    body.hint =
      "Apply supabase/migrations/0004_ai_assistant.sql — pgvector + card_embeddings missing.";
  } else if (
    body.embeddings.coverage.total > 0 &&
    body.embeddings.coverage.embedded < body.embeddings.coverage.total
  ) {
    body.hint = `Run pnpm assistant:backfill — ${
      body.embeddings.coverage.total - body.embeddings.coverage.embedded
    } cards still need embeddings.`;
  }

  return NextResponse.json(body);
}
