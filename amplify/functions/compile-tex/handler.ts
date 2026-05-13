/**
 * Tectonic compile handler.
 *
 * v1 invocation contract (POST):
 *   { tex: string, format: "latex_fragment" | "latex_doc" }
 * Response:
 *   { ok: true,  pdf: string (base64), log: string }
 *   { ok: false, error: string, log: string }
 *
 * Runs in a container image (see ./Dockerfile) so we can bundle Tectonic + a
 * pre-warmed package cache. The Next.js `/api/compile` route forwards to this
 * function when COMPILE_FUNCTION_URL is set; otherwise it shells out to a local
 * Tectonic via `src/lib/compile/local.ts`.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const TIMEOUT_MS = 25_000;
const PREAMBLE_PATH = process.env.PREAMBLE_PATH ?? "/var/task/preamble.tex";

type Event = {
  body?: string;
  rawBody?: string;
};

export const handler = async (event: Event) => {
  const raw = event.body ?? event.rawBody ?? "";
  let payload: { tex?: unknown; format?: unknown } = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: "Body must be JSON.", log: "" });
  }
  const tex = typeof payload.tex === "string" ? payload.tex : "";
  const format = payload.format === "latex_doc" ? "latex_doc" : "latex_fragment";
  if (!tex) {
    return json(400, { ok: false, error: "Field 'tex' is required.", log: "" });
  }

  const work = await mkdtemp(path.join(tmpdir(), `compile-${randomUUID()}-`));
  const main = path.join(work, "main.tex");
  const pdfPath = path.join(work, "main.pdf");

  try {
    const wrapped =
      format === "latex_doc"
        ? tex
        : await wrapFragment(tex);
    await writeFile(main, wrapped, "utf8");
    const { code, stderr, stdout } = await runTectonic(main, work);
    if (code !== 0) {
      return json(200, {
        ok: false,
        error:
          extractFirstError(stderr) ?? "Tectonic exited with a non-zero status.",
        log: `${stdout}\n${stderr}`,
      });
    }
    const pdf = await readFile(pdfPath);
    return json(200, { ok: true, pdf: pdf.toString("base64"), log: stderr });
  } catch (err) {
    return json(500, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      log: "",
    });
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
};

async function wrapFragment(tex: string): Promise<string> {
  const preamble = await readFile(PREAMBLE_PATH, "utf8");
  return [
    "\\documentclass[11pt]{article}",
    preamble.trim(),
    "\\begin{document}",
    tex,
    "\\end{document}",
    "",
  ].join("\n");
}

function runTectonic(
  main: string,
  outdir: string
): Promise<{ code: number; stdout: string; stderr: string }> {
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
    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);
    child.stdout.on("data", (b) => (stdout += b.toString()));
    child.stderr.on("data", (b) => (stderr += b.toString()));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function extractFirstError(stderr: string): string | null {
  for (const line of stderr.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith("error:") || t.startsWith("! ")) {
      return t.replace(/^! /, "").replace(/^error:\s*/, "");
    }
  }
  return null;
}

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
