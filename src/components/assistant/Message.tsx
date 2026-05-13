"use client";

import type { UIMessage } from "ai";
import { Bot, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolInvocation } from "@/components/assistant/ToolInvocation";

export function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const parts = message.parts ?? [
    // legacy / partial messages without parts: synthesize a text part
    { type: "text" as const, text: message.content },
  ];

  return (
    <div
      className={`flex gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-(--color-coral) text-white"
            : "bg-(--color-cream-3) text-(--color-coral)"
        }`}
        aria-hidden
      >
        {isUser ? (
          <UserRound className="size-4" />
        ) : (
          <Bot className="size-4" />
        )}
      </div>

      <div
        className={`flex max-w-[78%] flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {(() => {
          const rendered: React.ReactNode[] = [];
          parts.forEach((part, i) => {
            if (part.type === "text") {
              const text = part.text ?? "";
              if (!text.trim()) return;
              rendered.push(
                <div
                  key={i}
                  className={`rounded-(--radius-md) px-4 py-2.5 ${
                    isUser
                      ? "bg-(--color-coral) text-white"
                      : "bg-(--color-cream-2) text-(--color-ink) shadow-(--shadow-soft)"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words">{text}</p>
                  ) : (
                    <Markdown text={text} />
                  )}
                </div>
              );
            } else if (part.type === "tool-invocation") {
              const inv = part.toolInvocation;
              rendered.push(
                <ToolInvocation
                  key={inv.toolCallId}
                  toolName={inv.toolName}
                  state={inv.state}
                  args={"args" in inv ? (inv.args as Record<string, unknown>) : undefined}
                  result={"result" in inv ? inv.result : undefined}
                />
              );
            }
          });
          if (rendered.length === 0 && !isUser) {
            rendered.push(<EmptyAssistantTurn key="empty" />);
          }
          return rendered;
        })()}
      </div>
    </div>
  );
}

function EmptyAssistantTurn() {
  return (
    <div className="flex items-center gap-2 rounded-(--radius-md) border border-dashed border-(--color-edge) bg-(--color-cream-2) px-4 py-2.5 text-xs text-(--color-ink-muted)">
      <span>(no content emitted — check the dev server log for stream errors)</span>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none text-(--color-ink)">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children } = props;
            const isBlock = (className ?? "").includes("language-");
            return isBlock ? (
              <code className="block overflow-x-auto rounded-(--radius-sm) bg-(--color-cream-3) px-3 py-2 font-mono text-xs leading-relaxed text-(--color-ink)">
                {children}
              </code>
            ) : (
              <code className="rounded bg-(--color-cream-3) px-1 py-0.5 font-mono text-[0.95em] text-(--color-ink)">
                {children}
              </code>
            );
          },
          a(props) {
            return (
              <a
                {...props}
                className="text-(--color-sky) underline underline-offset-2"
              />
            );
          },
          p(props) {
            return <p {...props} className="my-1.5 first:mt-0 last:mb-0" />;
          },
          ul(props) {
            return <ul {...props} className="my-1.5 ml-5 list-disc" />;
          },
          ol(props) {
            return <ol {...props} className="my-1.5 ml-5 list-decimal" />;
          },
          h1(props) {
            return <h1 {...props} className="my-2 text-lg font-semibold" />;
          },
          h2(props) {
            return <h2 {...props} className="my-2 text-base font-semibold" />;
          },
          h3(props) {
            return <h3 {...props} className="my-1.5 text-sm font-semibold" />;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
