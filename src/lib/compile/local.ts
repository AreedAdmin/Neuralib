import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";
import { texEscape } from "@/lib/tex/escape";
import type { Enums } from "@/lib/supabase/types";

export type CompileResult =
  | { ok: true; pdf: Buffer; log: string }
  | { ok: false; error: string; log: string; reason: "missing_tectonic" | "compile_failed" | "io" };

export type CoverInfo = { title: string; subtitle: string };

const TECTONIC_TIMEOUT_MS = 30_000;

export async function compileLocally(
  content: string,
  format: Enums<"card_format">,
  preamble: string,
  cover?: CoverInfo
): Promise<CompileResult> {
  const work = await mkdtemp(path.join(tmpdir(), `neurolib-${nanoid(6)}-`));
  const main = path.join(work, "main.tex");
  const pdfPath = path.join(work, "main.pdf");

  try {
    const wrapped =
      format === "latex_doc" ? content : wrapFragment(content, preamble, cover);
    await writeFile(main, wrapped, "utf8");

    const { code, stdout, stderr } = await runTectonic(main, work);

    if (code === null) {
      return {
        ok: false,
        reason: "compile_failed",
        error: "Tectonic was killed (timeout). Try shrinking the source or raising the timeout.",
        log: stderr,
      };
    }

    if (code === 127 || /not found/i.test(stderr)) {
      return {
        ok: false,
        reason: "missing_tectonic",
        error:
          "Tectonic is not installed. See README §Phase 3 — quickest path on Linux/macOS:\n" +
          '  curl --proto "=https" --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh',
        log: stderr,
      };
    }

    if (code !== 0) {
      return {
        ok: false,
        reason: "compile_failed",
        error: extractFirstError(stderr) || "Tectonic exited with a non-zero status.",
        log: `${stdout}\n${stderr}`,
      };
    }

    const pdf = await readFile(pdfPath);
    return { ok: true, pdf, log: stderr };
  } catch (err) {
    return {
      ok: false,
      reason: "io",
      error: err instanceof Error ? err.message : String(err),
      log: "",
    };
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

function wrapFragment(
  content: string,
  preamble: string,
  cover?: CoverInfo
): string {
  const coverLine = cover
    ? `\\neurolibCover{${texEscape(cover.title)}}{${texEscape(cover.subtitle)}}`
    : "";
  return [
    "\\documentclass[11pt]{article}",
    preamble.trim(),
    "\\begin{document}",
    coverLine,
    content,
    "\\end{document}",
    "",
  ].join("\n");
}

function runTectonic(
  main: string,
  outdir: string
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      "tectonic",
      [
        "--keep-logs",
        "--outdir",
        outdir,
        "--chatter",
        "minimal",
        "--reruns",
        "1",
        main,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let stdout = "";
    let stderr = "";
    let killedForTimeout = false;

    const timer = setTimeout(() => {
      killedForTimeout = true;
      child.kill("SIGKILL");
    }, TECTONIC_TIMEOUT_MS);

    child.stdout.on("data", (b) => (stdout += b.toString()));
    child.stderr.on("data", (b) => (stderr += b.toString()));

    child.on("error", (err) => {
      clearTimeout(timer);
      stderr += `\nspawn error: ${err.message}`;
      resolve({ code: 127, stdout, stderr });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: killedForTimeout ? null : code, stdout, stderr });
    });
  });
}

/** Pull the first `! ...` line out of Tectonic stderr — that's usually the user-actionable error. */
function extractFirstError(stderr: string): string | null {
  for (const line of stderr.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("error:") || trimmed.startsWith("! ")) {
      return trimmed.replace(/^! /, "").replace(/^error:\s*/, "");
    }
  }
  return null;
}
