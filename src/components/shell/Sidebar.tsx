"use client";

import { BookOpen, Bot, Compass, Download, LogOut, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { NeurolibLogo } from "@/components/shell/NeurolibLogo";
import { SubjectTree } from "@/components/subjects/SubjectTree";
import { createComposition } from "@/lib/actions/compositions";
import { createSubject } from "@/lib/actions/subjects";
import type { SubjectNode } from "@/lib/db/subjects";
import { usePalette } from "@/stores/palette";

type CompositionLite = { id: string; title: string; kind: string };

export function Sidebar({
  email,
  tree,
  compositions,
}: {
  email: string;
  tree: SubjectNode[];
  compositions: CompositionLite[];
}) {
  const [pending, startTransition] = useTransition();
  const setPaletteOpen = usePalette((s) => s.setOpen);
  const router = useRouter();
  const pathname = usePathname();
  const [shortcut, setShortcut] = useState("⌘K");

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgent);
    setShortcut(isMac ? "⌘K" : "Ctrl K");
  }, []);

  function handleNewRoot() {
    const name = window.prompt("New subject name:");
    if (!name) return;
    startTransition(async () => {
      const res = await createSubject({ name, parentId: null });
      if (!res.ok) toast.error(res.error);
      else toast.success(`Created "${name.trim()}".`);
    });
  }

  function handleNewComposition() {
    const title = window.prompt("New composition title:");
    if (!title) return;
    startTransition(async () => {
      const res = await createComposition({ title });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`Created "${title.trim()}".`);
        router.push(`/compose/${res.value.id}`);
      }
    });
  }

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-4 border-r border-(--color-edge) bg-(--color-cream-2) px-4 py-5">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-(--color-coral) no-underline"
      >
        <NeurolibLogo className="size-5" /> Neurolib
      </Link>

      <div className="flex items-center gap-2 rounded-(--radius-sm) bg-(--color-cream-3) px-2.5 py-2 text-xs text-(--color-ink-muted)">
        <span className="truncate" title={email}>
          {email}
        </span>
        <form action="/auth/signout" method="post" className="ml-auto">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex size-6 items-center justify-center rounded-(--radius-xs) hover:bg-(--color-cream-2) hover:text-(--color-coral)"
          >
            <LogOut className="size-3.5" />
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex items-center gap-2 rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-1) px-3 py-2 text-sm text-(--color-ink-muted) shadow-(--shadow-soft) transition hover:border-(--color-coral)"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-(--color-edge) bg-(--color-cream-2) px-1.5 py-0.5 font-mono text-[10px] text-(--color-ink-muted)">
          {shortcut}
        </kbd>
      </button>

      <div className="flex items-stretch gap-1.5">
        <Link
          href="/assistant"
          className={`flex flex-1 items-center gap-2 rounded-(--radius-sm) border border-(--color-edge) px-3 py-2 text-sm no-underline shadow-(--shadow-soft) transition ${
            pathname.startsWith("/assistant") && pathname !== "/assistant/docs"
              ? "border-(--color-coral) bg-(--color-coral-soft) text-(--color-ink)"
              : "bg-(--color-cream-1) text-(--color-ink) hover:border-(--color-coral)"
          }`}
        >
          <Bot className="size-4 text-(--color-coral)" aria-hidden />
          <span className="flex-1">Assistant</span>
          <span className="rounded-full bg-(--color-coral-soft) px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-(--color-coral)">
            local AI
          </span>
        </Link>
        <Link
          href="/assistant/docs"
          aria-label="Tool reference"
          title="Tool reference"
          className={`flex shrink-0 items-center justify-center rounded-(--radius-sm) border border-(--color-edge) px-2.5 py-2 shadow-(--shadow-soft) transition ${
            pathname === "/assistant/docs"
              ? "border-(--color-coral) bg-(--color-coral-soft) text-(--color-coral)"
              : "bg-(--color-cream-1) text-(--color-ink-muted) hover:border-(--color-coral) hover:text-(--color-coral)"
          }`}
        >
          <BookOpen className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto pr-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
            Subjects
          </h2>
          <button
            type="button"
            onClick={handleNewRoot}
            disabled={pending}
            aria-label="New subject"
            className="flex size-6 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) hover:bg-(--color-cream-3) hover:text-(--color-coral) disabled:opacity-50"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {tree.length === 0 ? (
          <p className="px-2 text-sm text-(--color-ink-muted)">
            No subjects yet. Click <span className="font-medium">+</span> to add one.
          </p>
        ) : (
          <SubjectTree nodes={tree} depth={0} pathSoFar={[]} />
        )}

        <div className="mt-4 flex items-center justify-between px-1">
          <Link
            href="/compose"
            className="text-xs font-medium uppercase tracking-[0.16em] text-(--color-ink-muted) no-underline hover:text-(--color-ink)"
          >
            Compositions
          </Link>
          <button
            type="button"
            onClick={handleNewComposition}
            disabled={pending}
            aria-label="New composition"
            className="flex size-6 items-center justify-center rounded-(--radius-xs) text-(--color-ink-muted) hover:bg-(--color-cream-3) hover:text-(--color-coral) disabled:opacity-50"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {compositions.length === 0 ? (
          <p className="px-2 text-sm text-(--color-ink-muted)">
            No compositions yet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {compositions.map((c) => {
              const href = `/compose/${c.id}`;
              const isActive = pathname === href;
              return (
                <li key={c.id}>
                  <Link
                    href={href}
                    className={`flex items-center gap-1.5 rounded-(--radius-xs) px-2 py-1 text-sm text-(--color-ink) no-underline hover:bg-(--color-cream-3) ${
                      isActive ? "bg-(--color-coral-soft)" : ""
                    }`}
                  >
                    <Compass className="size-3.5 shrink-0 text-(--color-ink-muted)" aria-hidden />
                    <span className="truncate">{c.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <a
        href="/api/export"
        download
        className="mt-auto flex items-center gap-2 rounded-(--radius-xs) px-2 py-1.5 text-xs text-(--color-ink-muted) no-underline hover:bg-(--color-cream-3) hover:text-(--color-ink)"
      >
        <Download className="size-3.5" /> Export library (JSON)
      </a>
    </aside>
  );
}
