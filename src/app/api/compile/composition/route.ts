import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { compileLocally } from "@/lib/compile/local";
import { EXPORTS_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/compile/cache";
import { assembleBook } from "@/lib/compose/concat";
import { getComposition, getCompositionEntries } from "@/lib/db/compositions";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CompileSuccess = {
  ok: true;
  pdfUrl: string;
  cached: boolean;
  cardCount: number;
  warnings?: string[];
  log?: string;
};
type CompileFailure = {
  ok: false;
  error: string;
  log?: string;
  reason: "missing_tectonic" | "compile_failed" | "io" | "auth" | "not_found" | "db" | "empty";
};

export async function POST(
  request: Request
): Promise<NextResponse<CompileSuccess | CompileFailure>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "io", error: "Body must be JSON: { compositionId }" },
      { status: 400 }
    );
  }
  const compositionId = (body as { compositionId?: unknown })?.compositionId;
  if (typeof compositionId !== "string" || !compositionId) {
    return NextResponse.json(
      { ok: false, reason: "io", error: "compositionId is required." },
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

  const composition = await getComposition(compositionId);
  if (!composition) {
    return NextResponse.json(
      { ok: false, reason: "not_found", error: "Composition not found." },
      { status: 404 }
    );
  }

  const entries = await getCompositionEntries(compositionId);
  if (entries.length === 0) {
    return NextResponse.json(
      { ok: false, reason: "empty", error: "This composition has no entries yet." },
      { status: 200 }
    );
  }

  const { tex, cardCount, warnings } = await assembleBook(
    composition,
    entries,
    user.email ?? "Neurolib"
  );

  // Hash assembled tex (already includes preamble)
  const hash = createHash("sha256").update("comp-v1\n").update(tex).digest("hex");
  const storagePath = `${user.id}/${hash}.pdf`;

  // Cache hit?
  const { data: existing } = await supabase
    .from("exports")
    .select("storage_path")
    .eq("composition_id", compositionId)
    .eq("content_hash", hash)
    .eq("status", "ready")
    .maybeSingle();

  if (existing?.storage_path) {
    const { data: signed } = await supabase.storage
      .from(EXPORTS_BUCKET)
      .createSignedUrl(existing.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) {
      return NextResponse.json({
        ok: true,
        pdfUrl: signed.signedUrl,
        cached: true,
        cardCount,
        warnings: warnings.length ? warnings : undefined,
      });
    }
  }

  // Reserve a pending row
  const { data: pending, error: pendingErr } = await supabase
    .from("exports")
    .insert({
      owner_id: user.id,
      composition_id: compositionId,
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

  // Compile (the assembled book is a full document — pass as latex_doc, no preamble wrapping)
  const result = await compileLocally(tex, "latex_doc", "");
  if (!result.ok) {
    await supabase
      .from("exports")
      .update({ status: "failed", error: result.error })
      .eq("id", pending.id);
    return NextResponse.json(
      { ok: false, reason: result.reason, error: result.error, log: result.log },
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
    cardCount,
    warnings: warnings.length ? warnings : undefined,
    log: result.log,
  });
}
