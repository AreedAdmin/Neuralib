"use client";

import { useCompletion } from "@ai-sdk/react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef } from "react";

export type InlineComposerCtx = {
  cardId: string;
  from: number;
  to: number;
  selectionText: string;
};

export function InlineComposer({
  ctx,
  onInsert,
  onClose,
}: {
  ctx: InlineComposerCtx;
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    error,
  } = useCompletion({
    api: "/api/assistant/inline",
    streamProtocol: "text",
    body: { cardId: ctx.cardId, selectionText: ctx.selectionText },
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function tryInsert() {
    const out = completion.trim();
    if (out.length > 0) onInsert(out);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (isLoading) stop();
      else onClose();
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (completion && !isLoading) tryInsert();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) handleSubmit();
    }
  }

  const selBadge =
    ctx.selectionText.length > 0
      ? `replacing ${ctx.selectionText.length} char${ctx.selectionText.length === 1 ? "" : "s"}`
      : "insert at cursor";

  return (
    <div
      className="fixed inset-x-0 top-24 z-50 mx-auto w-[min(720px,calc(100vw-2rem))] rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-1) shadow-2xl"
      role="dialog"
      aria-label="Inline AI composer"
    >
      <div className="flex items-center justify-between gap-2 border-b border-(--color-edge) px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          <Sparkles className="size-3.5 text-(--color-coral)" />
          Inline AI
          <span className="rounded bg-(--color-cream-3) px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal">
            {selBadge}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-6 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) hover:bg-(--color-cream-3) hover:text-(--color-ink)"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && !isLoading) handleSubmit();
        }}
        className="flex flex-col gap-2 p-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          placeholder={
            ctx.selectionText
              ? "Rewrite this selection… (e.g. tighten, fix the proof, convert to align*)"
              : "Build something… (e.g. draw a TikZ diagram of a binary search tree using the linked cards)"
          }
          rows={2}
          disabled={isLoading}
          className="min-h-[48px] w-full resize-none rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) px-3 py-2 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink-muted) focus:border-(--color-coral) disabled:opacity-60"
        />

        {completion ? (
          <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) p-2 font-mono text-xs text-(--color-ink)">
            {completion}
          </pre>
        ) : null}

        {error ? (
          <p className="rounded-(--radius-xs) border border-(--color-coral) bg-(--color-coral-soft) px-2 py-1 text-xs text-(--color-coral)">
            {error.message || "Inline AI request failed."}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-(--color-ink-muted)">
            {isLoading
              ? "Streaming… Esc to stop"
              : completion
                ? "⌘↵ insert · Esc discard"
                : "↵ send · Esc cancel"}
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="flex h-8 items-center gap-1 rounded-(--radius-sm) bg-(--color-cream-3) px-3 text-xs text-(--color-ink) hover:bg-(--color-cream-1)"
              >
                <Loader2 className="size-3 animate-spin" /> Stop
              </button>
            ) : null}
            {completion && !isLoading ? (
              <button
                type="button"
                onClick={tryInsert}
                className="flex h-8 items-center gap-1 rounded-(--radius-sm) bg-(--color-coral) px-3 text-xs font-medium text-white hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)]"
              >
                Insert <span className="opacity-70">⌘↵</span>
              </button>
            ) : null}
            {!isLoading && !completion ? (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-8 items-center gap-1 rounded-(--radius-sm) bg-(--color-coral) px-3 text-xs font-medium text-white transition hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)] disabled:opacity-50"
              >
                <Send className="size-3" /> Send
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
