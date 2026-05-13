import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Enums } from "@/lib/supabase/types";

const EXPORTS_BUCKET = "neuralib-exports";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Read the bundled preamble fresh on every call.
 * Don't cache: edits to templates/preamble.tex must take effect immediately
 * for both the live dev server and any hash recomputation.
 */
export async function loadPreamble(): Promise<string> {
  const file = path.join(process.cwd(), "templates", "preamble.tex");
  return readFile(file, "utf8");
}

export function computeContentHash(input: {
  content: string;
  format: Enums<"card_format">;
  preamble: string;
}): string {
  const h = createHash("sha256");
  h.update(`v1\n`); // bump if we change the wrapping algorithm itself
  h.update(`${input.format}\n`);
  h.update(`${input.content}\n`);
  h.update("---preamble---\n");
  h.update(input.preamble);
  return h.digest("hex");
}

/** Path inside the neuralib-exports bucket for a given owner + hash. */
export function exportsStoragePath(ownerId: string, hash: string): string {
  return `${ownerId}/${hash}.pdf`;
}

export { EXPORTS_BUCKET, SIGNED_URL_TTL_SECONDS };
