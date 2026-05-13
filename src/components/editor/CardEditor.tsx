"use client";

import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorView } from "@codemirror/view";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { ChevronLeft, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CardLinksPanel } from "@/components/cards/CardLinksPanel";
import { CardTagBar } from "@/components/cards/CardTagBar";
import { autosaveCard } from "@/lib/actions/cards";
import type { LinkedCard } from "@/lib/db/links";
import type { Enums } from "@/lib/supabase/types";

type TagLite = { id: string; name: string; color: string | null };
type CardOption = { id: string; title: string; subjectName: string };

const stexLang = StreamLanguage.define(stex);

const daylight = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "var(--color-cream-2)",
      color: "var(--color-ink)",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      lineHeight: "1.6",
    },
    ".cm-content": {
      caretColor: "var(--color-coral)",
      padding: "16px 0",
    },
    ".cm-cursor": { borderLeftColor: "var(--color-coral)", borderLeftWidth: "2px" },
    ".cm-gutters": {
      backgroundColor: "var(--color-cream-3)",
      color: "var(--color-ink-muted)",
      borderRight: "1px solid var(--color-edge)",
    },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 8px" },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in oklab, var(--color-sunshine), white 92%)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in oklab, var(--color-sunshine), white 88%)",
      color: "var(--color-ink)",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--color-sunshine)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "color-mix(in oklab, var(--color-sky), white 80%)",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "color-mix(in oklab, var(--color-coral), white 78%)",
      color: "var(--color-ink)",
    },
  },
  { dark: false }
);

const extensions: Extension[] = [stexLang, daylight, EditorView.lineWrapping];

type SaveStatus =
  | { kind: "idle"; savedAt: Date | null }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

export function CardEditor({
  initial,
  subject,
  tags,
  links,
  onCompile,
  onToggleEditor,
}: {
  initial: {
    id: string;
    title: string;
    summary: string | null;
    content: string;
    format: Enums<"card_format">;
    updatedAt: string;
  };
  subject: { name: string; path: string[] };
  tags: { own: TagLite[]; available: TagLite[] };
  links: {
    outgoing: LinkedCard[];
    incoming: LinkedCard[];
    availableCards: CardOption[];
  };
  onCompile?: () => void;
  onToggleEditor?: () => void;
}) {
  const [content, setContent] = useState(initial.content);
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState<SaveStatus>({
    kind: "idle",
    savedAt: new Date(initial.updatedAt),
  });
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (next: { content: string; title?: string }, manual: boolean) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setStatus({ kind: "saving" });
      startTransition(async () => {
        const res = await autosaveCard({
          id: initial.id,
          content: next.content,
          title: next.title,
        });
        if (!res.ok) {
          setStatus({ kind: "error", message: res.error });
          toast.error(res.error);
          return;
        }
        setStatus({ kind: "idle", savedAt: new Date(res.value.savedAt) });
        if (manual && onCompile) {
          onCompile();
        }
      });
    },
    [initial.id, onCompile]
  );

  const triggerDebouncedSave = useCallback(
    (nextContent: string, nextTitle?: string) => {
      setStatus({ kind: "dirty" });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        save({ content: nextContent, title: nextTitle }, false);
      }, 1500);
    },
    [save]
  );

  function onContentChange(next: string) {
    setContent(next);
    triggerDebouncedSave(next, title !== initial.title ? title : undefined);
  }

  function onTitleChange(next: string) {
    setTitle(next);
    triggerDebouncedSave(content, next);
  }

  // Cmd-S / Ctrl-S → manual save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save({ content, title: title !== initial.title ? title : undefined }, true);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [content, title, initial.title, save]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const backHref = `/s/${subject.path.join("/")}`;

  return (
    <section className="flex h-screen flex-col border-r border-(--color-edge) bg-(--color-cream-2)">
      <header className="flex items-center gap-3 border-b border-(--color-edge) px-4 py-3">
        <Link
          href={backHref}
          className="flex size-8 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) no-underline hover:bg-(--color-cream-3) hover:text-(--color-ink)"
          aria-label="Back to subject"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          {subject.name}
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled card"
          className="flex-1 truncate bg-transparent text-lg font-semibold text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)"
        />
        <SaveStatusBadge status={status} />
        {onToggleEditor ? (
          <button
            type="button"
            onClick={onToggleEditor}
            aria-label="Hide editor (⌘\\)"
            title="Hide editor (⌘\\)"
            className="flex size-8 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) hover:bg-(--color-cream-3) hover:text-(--color-ink)"
          >
            <PanelLeftClose className="size-4" />
          </button>
        ) : null}
      </header>

      <CardTagBar
        cardId={initial.id}
        initial={tags.own}
        available={tags.available}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          value={content}
          onChange={onContentChange}
          extensions={extensions}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            foldGutter: false,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
          }}
          height="100%"
          style={{ height: "100%" }}
        />
      </div>

      <CardLinksPanel
        cardId={initial.id}
        outgoing={links.outgoing}
        incoming={links.incoming}
        availableCards={links.availableCards}
      />
    </section>
  );
}

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  let label: string;
  let dot: string;
  let tooltip: string | undefined;
  switch (status.kind) {
    case "idle":
      label = status.savedAt
        ? `Saved · ${status.savedAt.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "Saved";
      dot = "var(--color-mint)";
      break;
    case "dirty":
      label = "Editing…";
      dot = "var(--color-warning)";
      break;
    case "saving":
      label = "Saving…";
      dot = "var(--color-sky)";
      break;
    case "error":
      label = "Save failed";
      dot = "var(--color-coral)";
      tooltip = status.message;
      break;
  }
  return (
    <span
      className="flex items-center gap-2 text-xs text-(--color-ink-muted)"
      title={tooltip}
    >
      <span
        aria-hidden
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: dot }}
      />
      {label}
    </span>
  );
}
