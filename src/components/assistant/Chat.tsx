"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { BookOpen, Bot, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Message } from "@/components/assistant/Message";

export function Chat({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: UIMessage[];
}) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop,
  } = useChat({
    api: "/api/assistant/chat",
    id: threadId,
    body: { threadId },
    initialMessages,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  return (
    <section className="flex h-screen flex-col bg-(--color-cream-1)">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-8">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((m) => <Message key={m.id} message={m} />)
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-(--color-edge) bg-(--color-cream-2) px-6 py-3"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask Neurolib to draft, search, link, or review…"
            rows={2}
            disabled={isStreaming}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isStreaming) {
                  handleSubmit();
                }
              }
            }}
            className="min-h-[44px] flex-1 resize-none rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-1) px-3 py-2 text-(--color-ink) outline-none placeholder:text-(--color-ink-muted) focus:border-(--color-coral) disabled:opacity-60"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="flex size-11 items-center justify-center rounded-(--radius-sm) bg-(--color-cream-3) text-(--color-ink-muted) hover:bg-(--color-cream-1)"
              aria-label="Stop"
              title="Stop"
            >
              <Loader2 className="size-4 animate-spin" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              title="Send (Enter)"
              className="flex size-11 items-center justify-center rounded-(--radius-sm) bg-(--color-coral) text-white transition hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)] disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          )}
        </div>
        <div className="mx-auto mt-1.5 flex max-w-3xl items-center justify-between gap-3 text-[10px] text-(--color-ink-muted)">
          <span>
            Read tools execute live; write tools surface a proposal you must Approve.
          </span>
          <Link
            href="/assistant/docs"
            className="flex items-center gap-1 text-(--color-coral) no-underline hover:underline"
          >
            <BookOpen className="size-3" />
            What can Neurolib do?
          </Link>
        </div>
      </form>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-(--radius-md) border border-dashed border-(--color-edge) bg-(--color-cream-2) px-8 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-(--radius-md) bg-(--color-coral-soft) text-(--color-coral)">
        <Bot className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-(--color-ink)">
        Ask Neurolib something.
      </h2>
      <p className="max-w-md text-sm text-(--color-ink-muted)">
        Try: "list my subjects", "draft a card on PageRank under Graph Algorithms",
        or "review the LaTeX in the PageRank card".
      </p>
    </div>
  );
}
