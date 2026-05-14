"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CardEditor } from "@/components/editor/CardEditor";
import { PdfPreview } from "@/components/preview/PdfPreview";
import type { LinkedCard } from "@/lib/db/links";
import type { Enums } from "@/lib/supabase/types";
import { useFocusMode } from "@/stores/focus-mode";

export type PreviewState =
  | { kind: "empty" }
  | { kind: "compiling"; previousUrl: string | null }
  | {
      kind: "ready";
      url: string;
      cached: boolean;
      log?: string;
      compiledAt: Date;
    }
  | {
      kind: "error";
      error: string;
      log: string;
      reason: string;
      previousUrl: string | null;
    };

type TagLite = { id: string; name: string; color: string | null };
type CardOption = { id: string; title: string; subjectName: string };

export function CardWorkspace({
  initial,
  subject,
  tags,
  links,
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
}) {
  const [preview, setPreview] = useState<PreviewState>({ kind: "empty" });
  const [editorOpen, setEditorOpen] = useState(true);
  const focusMode = useFocusMode((s) => s.on);

  const toggleEditor = useCallback(() => setEditorOpen((v) => !v), []);

  const showEditor = editorOpen || focusMode;
  const showPreview = !focusMode;

  // Cmd+\ / Ctrl+\ → toggle editor pane
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleEditor();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleEditor]);

  const compile = useCallback(async () => {
    setPreview((prev) => ({
      kind: "compiling",
      previousUrl:
        prev.kind === "ready"
          ? prev.url
          : prev.kind === "error"
            ? prev.previousUrl
            : null,
    }));

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: initial.id }),
      });
      const data = (await res.json()) as
        | { ok: true; pdfUrl: string; cached: boolean; log?: string }
        | { ok: false; error: string; log?: string; reason: string };

      if (!data.ok) {
        setPreview((prev) => ({
          kind: "error",
          error: data.error,
          log: data.log ?? "",
          reason: data.reason,
          previousUrl: prev.kind === "compiling" ? prev.previousUrl : null,
        }));
        toast.error(data.error.split("\n")[0]);
        return;
      }

      setPreview({
        kind: "ready",
        url: data.pdfUrl,
        cached: data.cached,
        log: data.log,
        compiledAt: new Date(),
      });
      toast.success(data.cached ? "Loaded cached PDF." : "Compiled.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPreview((prev) => ({
        kind: "error",
        error: msg,
        log: "",
        reason: "io",
        previousUrl: prev.kind === "compiling" ? prev.previousUrl : null,
      }));
      toast.error(msg);
    }
  }, [initial.id]);

  return (
    <main
      className={`grid h-screen gap-0 ${
        showEditor && showPreview ? "grid-cols-2" : "grid-cols-1"
      }`}
    >
      {showEditor ? (
        <CardEditor
          initial={initial}
          subject={subject}
          tags={tags}
          links={links}
          onCompile={compile}
          onToggleEditor={focusMode ? undefined : toggleEditor}
        />
      ) : null}
      {showPreview ? (
        <PdfPreview
          state={preview}
          onRecompile={compile}
          editorOpen={editorOpen}
          onToggleEditor={toggleEditor}
        />
      ) : null}
    </main>
  );
}
