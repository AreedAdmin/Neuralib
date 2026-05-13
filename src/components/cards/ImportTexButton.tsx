"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { createCard } from "@/lib/actions/cards";

const TITLE_PATTERNS = [
  /\\title\{([^{}]+)\}/,
  /\\chapter\*?\{([^{}]+)\}/,
  /\\section\*?\{([^{}]+)\}/,
];

function extractTitle(content: string, fallback: string): string {
  for (const re of TITLE_PATTERNS) {
    const m = re.exec(content);
    if (m && m[1].trim()) return m[1].trim();
  }
  return fallback;
}

function detectFormat(content: string): "latex_fragment" | "latex_doc" {
  return /\\documentclass\b/.test(content) ? "latex_doc" : "latex_fragment";
}

export function ImportTexButton({ subjectId }: { subjectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so the same filename re-fires onChange next time
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error("File is over 1 MB — too big for a single card.");
      return;
    }

    let content: string;
    try {
      content = await file.text();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file.");
      return;
    }

    const baseName = file.name.replace(/\.tex$/i, "");
    const title = extractTitle(content, baseName);
    const format = detectFormat(content);

    startTransition(async () => {
      const res = await createCard({
        subjectId,
        title,
        content,
        format,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Imported "${title}" (${format === "latex_doc" ? "full document" : "fragment"}).`);
      router.push(`/c/${res.value.id}/edit`);
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".tex,text/x-tex,text/plain"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-2 rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-2) px-3 py-2 text-sm font-medium text-(--color-ink) transition hover:border-(--color-coral) disabled:opacity-50"
      >
        <Upload className="size-4" />
        Import .tex
      </button>
    </>
  );
}
