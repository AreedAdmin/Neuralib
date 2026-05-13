import { NextResponse } from "next/server";
import { compileLocally } from "@/lib/compile/local";
import {
  EXPORTS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  computeContentHash,
  exportsStoragePath,
  loadPreamble,
} from "@/lib/compile/cache";
import { listSubjects } from "@/lib/db/subjects";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

export const runtime = "nodejs"; // child_process needs the Node runtime

type CompileSuccess = {
  ok: true;
  pdfUrl: string;
  cached: boolean;
  log?: string;
};
type CompileFailure = {
  ok: false;
  error: string;
  log?: string;
  reason: "missing_tectonic" | "compile_failed" | "io" | "auth" | "not_found" | "db";
};

export async function POST(request: Request): Promise<NextResponse<CompileSuccess | CompileFailure>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "io", error: "Body must be JSON: { cardId }" },
      { status: 400 }
    );
  }
  const cardId = (body as { cardId?: unknown })?.cardId;
  if (typeof cardId !== "string" || !cardId) {
    return NextResponse.json(
      { ok: false, reason: "io", error: "cardId is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "auth", error: "Sign in required." },
      { status: 401 }
    );
  }

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .select("id, content, format, owner_id, title, subject_id")
    .eq("id", cardId)
    .maybeSingle();
  if (cardErr) {
    return NextResponse.json(
      { ok: false, reason: "db", error: cardErr.message },
      { status: 200 }
    );
  }
  if (!card) {
    return NextResponse.json(
      { ok: false, reason: "not_found", error: "Card not found." },
      { status: 404 }
    );
  }

  const preamble = await loadPreamble();
  const content = card.content;
  const format = card.format as Enums<"card_format">;

  // Resolve subject path → human-readable subtitle for the cover page.
  const subjects = await listSubjects();
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const namePath: string[] = [];
  let cur = byId.get(card.subject_id);
  while (cur) {
    namePath.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  const cover = {
    title: card.title,
    subtitle: namePath.join(" / "),
  };

  // Hash includes cover so subject renames invalidate the cached PDF.
  const hash = computeContentHash({
    content: `${cover.title}\n${cover.subtitle}\n${content}`,
    format,
    preamble,
  });
  const storagePath = exportsStoragePath(user.id, hash);

  // Cache hit?
  const { data: existing } = await supabase
    .from("exports")
    .select("id, status, storage_path")
    .eq("card_id", cardId)
    .eq("content_hash", hash)
    .eq("status", "ready")
    .maybeSingle();

  if (existing?.storage_path) {
    const { data: signed, error: signedErr } = await supabase.storage
      .from(EXPORTS_BUCKET)
      .createSignedUrl(existing.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) {
      return NextResponse.json({
        ok: true,
        pdfUrl: signed.signedUrl,
        cached: true,
      });
    }
    // signed-URL failure falls through to a fresh compile
    if (signedErr) console.warn("compile: signed URL failed for cached export:", signedErr.message);
  }

  // Reserve a pending row
  const { data: pending, error: pendingErr } = await supabase
    .from("exports")
    .insert({
      owner_id: user.id,
      card_id: cardId,
      format: "pdf",
      content_hash: hash,
      status: "pending",
    })
    .select("id")
    .single();
  if (pendingErr || !pending) {
    return NextResponse.json(
      { ok: false, reason: "db", error: pendingErr?.message ?? "Failed to record export." },
      { status: 200 }
    );
  }

  // Compile
  const result = await compileLocally(content, format, preamble, cover);
  if (!result.ok) {
    await supabase
      .from("exports")
      .update({ status: "failed", error: result.error })
      .eq("id", pending.id);
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        error: result.error,
        log: result.log,
      },
      { status: 200 }
    );
  }

  // Upload PDF
  const { error: uploadErr } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .upload(storagePath, result.pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) {
    await supabase
      .from("exports")
      .update({ status: "failed", error: uploadErr.message })
      .eq("id", pending.id);
    return NextResponse.json(
      { ok: false, reason: "db", error: uploadErr.message, log: result.log },
      { status: 200 }
    );
  }

  await supabase
    .from("exports")
    .update({
      status: "ready",
      storage_path: storagePath,
      bytes: result.pdf.byteLength,
    })
    .eq("id", pending.id);

  const { data: signed } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (!signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, reason: "db", error: "Compile succeeded but signed-URL failed." },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ok: true,
    pdfUrl: signed.signedUrl,
    cached: false,
    log: result.log,
  });
}
