"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { ChevronRight, FileText, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { searchCardsAction } from "@/lib/actions/search";
import type { SearchHit } from "@/lib/db/search";
import { usePalette } from "@/stores/palette";

export function CommandPalette() {
  const open = usePalette((s) => s.open);
  const setOpen = usePalette((s) => s.setOpen);
  const toggle = usePalette((s) => s.toggle);

  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryIdRef = useRef(0);

  // Global ⌘K / Ctrl-K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // Reset query when palette closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myId = ++queryIdRef.current;
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await searchCardsAction(trimmed);
        if (myId === queryIdRef.current) {
          setHits(result);
          setLoading(false);
        }
      });
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const trimmed = query.trim();
  const showAllHref = useMemo(
    () => (trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search"),
    [trimmed]
  );

  function navigateTo(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search Neurolib"
      shouldFilter={false}
      className="fixed inset-0 z-50 flex items-start justify-center"
    >
      <div
        className="fixed inset-0 bg-(--color-ink)/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div className="relative mt-[12vh] w-[min(640px,92vw)] overflow-hidden rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) shadow-(--shadow-lift)">
        <Dialog.Title className="sr-only">Search Neurolib</Dialog.Title>
        <Dialog.Description className="sr-only">
          Type to search across every card. Use arrow keys to navigate, Enter to open, Escape to close.
        </Dialog.Description>
        <div className="flex items-center gap-2 border-b border-(--color-edge) px-4">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-(--color-sky)" />
          ) : (
            <Search className="size-4 text-(--color-ink-muted)" />
          )}
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search cards by title, content, or tag…"
            className="flex-1 bg-transparent py-3 text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)"
          />
          <kbd className="rounded border border-(--color-edge) bg-(--color-cream-3) px-1.5 py-0.5 font-mono text-[10px] text-(--color-ink-muted)">
            esc
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {!trimmed ? (
            <div className="px-3 py-6 text-center text-sm text-(--color-ink-muted)">
              Type to search across every card.
            </div>
          ) : hits.length === 0 && !loading ? (
            <Command.Empty className="px-3 py-6 text-center text-sm text-(--color-ink-muted)">
              No cards match <span className="font-medium text-(--color-ink)">{trimmed}</span>.
            </Command.Empty>
          ) : null}

          {hits.length > 0 ? (
            <Command.Group heading="" className="flex flex-col gap-1">
              {hits.map((hit) => (
                <Command.Item
                  key={hit.id}
                  value={hit.id}
                  onSelect={() => navigateTo(`/c/${hit.id}/edit`)}
                  className="cursor-pointer rounded-(--radius-sm) px-3 py-2 text-(--color-ink) data-[selected=true]:bg-(--color-coral-soft)"
                >
                  <Hit hit={hit} />
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>

        <div className="flex items-center justify-between gap-2 border-t border-(--color-edge) px-4 py-2 text-xs text-(--color-ink-muted)">
          <div className="flex items-center gap-3">
            <KbdHint label="↑↓" desc="navigate" />
            <KbdHint label="↵" desc="open" />
            <KbdHint label="esc" desc="close" />
          </div>
          {trimmed ? (
            <button
              type="button"
              onClick={() => navigateTo(showAllHref)}
              className="font-medium text-(--color-coral) hover:underline"
            >
              View all results →
            </button>
          ) : null}
        </div>
      </div>
    </Command.Dialog>
  );
}

function Hit({ hit }: { hit: SearchHit }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-(--color-ink-muted)">
        <FileText className="size-3" aria-hidden />
        {hit.subjectPath.length > 0 ? (
          <>
            {hit.subjectPath.slice(0, -1).map((slug, i) => (
              <span key={`${i}-${slug}`} className="flex items-center gap-1">
                <span>{slug}</span>
                <ChevronRight className="size-3" aria-hidden />
              </span>
            ))}
            <span className="font-medium text-(--color-ink-muted)">
              {hit.subjectName}
            </span>
          </>
        ) : (
          <span>{hit.subjectName}</span>
        )}
      </div>
      <div className="font-medium text-(--color-ink)">{hit.title}</div>
      {hit.snippet ? (
        <div
          className="line-clamp-2 text-sm text-(--color-ink-muted)"
          // ts_headline emits its own <mark>...</mark>; trusted (single user owns content)
          dangerouslySetInnerHTML={{ __html: hit.snippet }}
        />
      ) : hit.summary ? (
        <div className="line-clamp-2 text-sm text-(--color-ink-muted)">
          {hit.summary}
        </div>
      ) : null}
    </div>
  );
}

function KbdHint({ label, desc }: { label: string; desc: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="rounded border border-(--color-edge) bg-(--color-cream-3) px-1 py-0.5 font-mono text-[10px] text-(--color-ink)">
        {label}
      </kbd>
      <span>{desc}</span>
    </span>
  );
}
