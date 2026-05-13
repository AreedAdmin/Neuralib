"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Construction,
  FileText,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { PreviewState } from "@/components/editor/CardWorkspace";

export function PdfPreview({
  state,
  onRecompile,
  editorOpen,
  onToggleEditor,
}: {
  state: PreviewState;
  onRecompile: () => void;
  editorOpen?: boolean;
  onToggleEditor?: () => void;
}) {
  return (
    <section
      aria-label="PDF preview"
      className="flex h-screen min-w-0 flex-col bg-(--color-cream-1)"
    >
      <header className="flex items-center justify-between gap-2 border-b border-(--color-edge) bg-(--color-cream-2) px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          {onToggleEditor ? (
            <button
              type="button"
              onClick={onToggleEditor}
              aria-label={editorOpen ? "Hide editor (⌘\\)" : "Show editor (⌘\\)"}
              title={editorOpen ? "Hide editor (⌘\\)" : "Show editor (⌘\\)"}
              className="flex size-8 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) hover:bg-(--color-cream-3) hover:text-(--color-ink)"
            >
              {editorOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </button>
          ) : null}
          <FileText className="size-3.5" /> Preview
        </div>
        <div className="flex items-center gap-2">
          <StatusChip state={state} />
          <button
            type="button"
            onClick={onRecompile}
            disabled={state.kind === "compiling"}
            aria-label="Recompile"
            title="Recompile (⌘S)"
            className="flex size-8 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) hover:bg-(--color-cream-3) hover:text-(--color-ink) disabled:opacity-50"
          >
            {state.kind === "compiling" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <Body state={state} onRecompile={onRecompile} />
      </div>
    </section>
  );
}

function Body({
  state,
  onRecompile,
}: {
  state: PreviewState;
  onRecompile: () => void;
}) {
  if (state.kind === "empty") {
    return <EmptyState onRecompile={onRecompile} />;
  }

  if (state.kind === "compiling") {
    return (
      <div className="relative h-full w-full">
        {state.previousUrl ? (
          <iframe
            src={state.previousUrl}
            className="h-full w-full border-0 opacity-50 transition-opacity"
            title="PDF preview (stale)"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-(--color-cream-2) px-4 py-2 text-sm text-(--color-ink) shadow-(--shadow-soft) ring-1 ring-(--color-edge)">
            <Loader2 className="size-4 animate-spin text-(--color-sky)" />
            Compiling…
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "ready") {
    return (
      <iframe
        src={state.url}
        className="h-full w-full border-0"
        title="PDF preview"
      />
    );
  }

  return <ErrorState state={state} onRecompile={onRecompile} />;
}

function EmptyState({ onRecompile }: { onRecompile: () => void }) {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);
  const shortcut = isMac ? "⌘S" : "Ctrl+S";
  return (
    <div className="flex h-full items-center justify-center p-12">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-(--radius-md) border border-dashed border-(--color-edge) bg-(--color-cream-2) px-8 py-10 text-center shadow-(--shadow-soft)">
        <div
          className="flex size-12 items-center justify-center rounded-(--radius-md) bg-(--color-sky-soft) text-(--color-sky)"
          aria-hidden
        >
          <Construction className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-(--color-ink)">
          No PDF yet.
        </h2>
        <p className="text-sm text-(--color-ink-muted)">
          Press{" "}
          <kbd className="rounded border border-(--color-edge) bg-(--color-cream-3) px-1.5 py-0.5 font-mono text-xs text-(--color-ink)">
            {shortcut}
          </kbd>{" "}
          (or click <span className="font-medium">↻</span>) to save and compile.
        </p>
        <button
          type="button"
          onClick={onRecompile}
          className="rounded-(--radius-sm) bg-(--color-coral) px-3 py-1.5 text-sm font-semibold text-white hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)]"
        >
          Compile now
        </button>
      </div>
    </div>
  );
}

function ErrorState({
  state,
  onRecompile,
}: {
  state: Extract<PreviewState, { kind: "error" }>;
  onRecompile: () => void;
}) {
  const [showLog, setShowLog] = useState(false);
  const isMissing = state.reason === "missing_tectonic";

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-8">
      <div className="rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) p-5 shadow-(--shadow-soft)">
        <div className="flex items-start gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-(--radius-sm) text-(--color-coral)"
            style={{ backgroundColor: "color-mix(in oklab, var(--color-coral), white 80%)" }}
            aria-hidden
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <h3 className="font-semibold text-(--color-ink)">
              {isMissing ? "Tectonic isn't installed yet." : "Compile failed."}
            </h3>
            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-(--color-ink-muted)">
              {state.error}
            </pre>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onRecompile}
                className="rounded-(--radius-sm) bg-(--color-coral) px-3 py-1.5 text-sm font-semibold text-white hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)]"
              >
                Try again
              </button>
              {state.log ? (
                <button
                  type="button"
                  onClick={() => setShowLog((v) => !v)}
                  className="rounded-(--radius-sm) bg-(--color-cream-3) px-3 py-1.5 text-sm font-medium text-(--color-ink) hover:bg-(--color-coral-soft)"
                >
                  {showLog ? "Hide log" : "Show log"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {showLog && state.log ? (
          <pre className="mt-4 max-h-[40vh] overflow-auto rounded-(--radius-sm) bg-(--color-cream-3) p-3 font-mono text-xs leading-relaxed text-(--color-ink-muted)">
            {state.log}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function StatusChip({ state }: { state: PreviewState }) {
  if (state.kind === "ready") {
    const time = state.compiledAt.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <span className="flex items-center gap-1.5 text-xs text-(--color-ink-muted)">
        <CheckCircle2 className="size-3.5 text-(--color-mint)" />
        {state.cached ? `Cached · ${time}` : `Compiled · ${time}`}
      </span>
    );
  }
  if (state.kind === "compiling") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-(--color-ink-muted)">
        <Loader2 className="size-3.5 animate-spin text-(--color-sky)" />
        Compiling
      </span>
    );
  }
  if (state.kind === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-(--color-coral)">
        <AlertTriangle className="size-3.5" />
        Error
      </span>
    );
  }
  return null;
}
