"use client";

/**
 * Cursor-style "autotab" inline suggestions for CodeMirror.
 *
 * As the user pauses typing, we ask the LaTeX autocomplete model for the most
 * likely continuation at the cursor and render it as dimmed ghost text. Tab
 * accepts it, Escape (or any edit / cursor move) dismisses it.
 *
 * This is deliberately separate from the static dropdown (latexCompletions)
 * and the manual ⌘I composer — it never steals the dropdown's keys and only
 * fires on real user typing.
 */
import { completionStatus } from "@codemirror/autocomplete";
import { Prec, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

type Suggestion = { text: string; from: number };

const setSuggestion = StateEffect.define<Suggestion | null>();

const suggestionField = StateField.define<Suggestion | null>({
  create() {
    return null;
  },
  update(value, tr) {
    // An explicit effect always wins (set on fetch, cleared on accept/dismiss).
    for (const e of tr.effects) {
      if (e.is(setSuggestion)) return e.value;
    }
    if (!value) return null;
    // Any edit invalidates a pending suggestion...
    if (tr.docChanged) return null;
    // ...as does moving the caret away from the anchor.
    if (tr.selection && tr.newSelection.main.head !== value.from) return null;
    return value;
  },
});

class GhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  eq(other: GhostWidget) {
    return other.text === this.text;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-ghost-text";
    span.setAttribute("aria-hidden", "true");
    span.textContent = this.text;
    return span;
  }
  // Ghost text is non-interactive; let clicks fall through to the editor.
  ignoreEvent() {
    return false;
  }
}

function ghostDecorations(view: EditorView): DecorationSet {
  const s = view.state.field(suggestionField);
  const sel = view.state.selection.main;
  if (!s || !sel.empty || sel.head !== s.from) return Decoration.none;
  const deco = Decoration.widget({
    widget: new GhostWidget(s.text),
    side: 1,
  });
  return Decoration.set([deco.range(s.from)]);
}

const ghostRenderer = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = ghostDecorations(view);
    }
    update(u: ViewUpdate) {
      if (
        u.docChanged ||
        u.selectionSet ||
        u.startState.field(suggestionField) !== u.state.field(suggestionField)
      ) {
        this.decorations = ghostDecorations(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

/** Accept the current ghost suggestion. Returns false if there's nothing to accept. */
function acceptSuggestion(view: EditorView): boolean {
  const s = view.state.field(suggestionField, false);
  if (!s) return false;
  // Defer to the dropdown if it's open — Tab belongs to it then.
  if (completionStatus(view.state) === "active") return false;
  view.dispatch({
    changes: { from: s.from, insert: s.text },
    selection: { anchor: s.from + s.text.length },
    effects: setSuggestion.of(null),
    userEvent: "input.complete",
    scrollIntoView: true,
  });
  return true;
}

function dismissSuggestion(view: EditorView): boolean {
  if (!view.state.field(suggestionField, false)) return false;
  view.dispatch({ effects: setSuggestion.of(null) });
  return true;
}

function cleanCompletion(raw: string): string {
  let text = raw;
  // Models occasionally wrap output in a fence despite instructions.
  const fence = text.match(/^```(?:latex|tex)?\n([\s\S]*?)\n?```$/);
  if (fence) text = fence[1];
  // Trim trailing whitespace/newlines that would push the caret oddly, but
  // keep meaningful leading content (e.g. a leading space the model intends).
  return text.replace(/\s+$/, "");
}

/**
 * Driver: debounce on user typing, fetch a completion, and show it as ghost
 * text — but only if the caret hasn't moved since the request was issued.
 */
function suggestionDriver(delayMs: number) {
  return ViewPlugin.fromClass(
    class {
      timer: ReturnType<typeof setTimeout> | null = null;
      controller: AbortController | null = null;
      generation = 0;

      constructor(readonly view: EditorView) {}

      update(u: ViewUpdate) {
        if (!u.docChanged) return;
        const fromTyping = u.transactions.some(
          (tr) =>
            tr.isUserEvent("input.type") ||
            tr.isUserEvent("input") ||
            tr.isUserEvent("delete")
        );
        if (!fromTyping) return; // ignore programmatic inserts (incl. accepts)
        this.schedule();
      }

      schedule() {
        this.cancel();
        this.timer = setTimeout(() => this.run(), delayMs);
      }

      cancel() {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
        if (this.controller) {
          this.controller.abort();
          this.controller = null;
        }
      }

      async run() {
        const view = this.view;
        const sel = view.state.selection.main;
        if (!sel.empty) return; // no suggestions over a selection
        if (completionStatus(view.state) === "active") return; // dropdown owns it

        const pos = sel.head;
        const doc = view.state.doc;
        const prefix = doc.sliceString(Math.max(0, pos - 2000), pos);
        const suffix = doc.sliceString(pos, Math.min(doc.length, pos + 600));
        if (!prefix.trim()) return;

        const gen = ++this.generation;
        const controller = new AbortController();
        this.controller = controller;

        let text: string;
        try {
          const res = await fetch("/api/assistant/autotab", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prefix, suffix }),
            signal: controller.signal,
          });
          if (!res.ok) return;
          text = cleanCompletion(await res.text());
        } catch {
          return; // aborted or network error — silently drop
        }

        if (gen !== this.generation || !text) return;
        // Only show if the caret is still exactly where we asked from.
        const now = view.state.selection.main;
        if (!now.empty || now.head !== pos) return;
        view.dispatch({ effects: setSuggestion.of({ text, from: pos }) });
      }

      destroy() {
        this.cancel();
      }
    }
  );
}

const ghostTheme = EditorView.baseTheme({
  ".cm-ghost-text": {
    opacity: "0.45",
    color: "var(--color-ink-muted)",
    whiteSpace: "pre-wrap",
  },
});

/**
 * Wire up autotab inline suggestions. `delayMs` is the idle time after typing
 * before a request fires.
 */
export function inlineSuggestions({ delayMs = 450 }: { delayMs?: number } = {}) {
  return [
    suggestionField,
    ghostRenderer,
    suggestionDriver(delayMs),
    ghostTheme,
    Prec.highest(
      keymap.of([
        { key: "Tab", run: acceptSuggestion },
        { key: "Escape", run: dismissSuggestion },
      ])
    ),
  ];
}
