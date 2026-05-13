import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CompositionEntryWithCard, Composition } from "@/lib/db/compositions";
import { texEscape } from "@/lib/tex/escape";

const REF_COMMANDS = [
  "ref",
  "eqref",
  "cref",
  "Cref",
  "autoref",
  "pageref",
  "nameref",
  "vref",
];

const REF_RE = new RegExp(
  String.raw`\\(${REF_COMMANDS.join("|")})\{([^{}]+)\}`,
  "g"
);
const LABEL_RE = /\\label\{([^{}]+)\}/g;

/**
 * Namespace labels and intra-card refs by the card's slug.
 *
 * Behaviour:
 *   - every \label{X}                  → \label{<slug>:X}
 *   - \ref{X} when X is local          → \ref{<slug>:X}
 *   - \ref{other-slug:X}               → unchanged (explicit cross-card)
 *   - \ref{X} when X isn't local       → unchanged (assumed cross-card; user typed it themselves)
 */
export function namespaceLabels(content: string, slug: string): string {
  const localLabels = new Set<string>();
  let m: RegExpExecArray | null;
  LABEL_RE.lastIndex = 0;
  while ((m = LABEL_RE.exec(content)) !== null) {
    localLabels.add(m[1]);
  }

  // 1. rewrite labels first
  const withLabels = content.replace(LABEL_RE, (_match, name: string) => {
    if (name.includes(":")) return `\\label{${name}}`; // already namespaced
    return `\\label{${slug}:${name}}`;
  });

  // 2. rewrite intra-card refs
  return withLabels.replace(
    REF_RE,
    (full: string, cmd: string, name: string) => {
      if (name.includes(":")) return full; // explicit cross-card reference
      if (localLabels.has(name)) return `\\${cmd}{${slug}:${name}}`;
      return full; // unknown — leave alone, user may have meant a foreign label
    }
  );
}

// Always read fresh — see note in compile/cache.ts.
async function loadTemplate(): Promise<string> {
  return readFile(path.join(process.cwd(), "templates", "book.tex"), "utf8");
}

async function loadPreamble(): Promise<string> {
  return readFile(path.join(process.cwd(), "templates", "preamble.tex"), "utf8");
}

export type AssembledBook = {
  tex: string;
  cardCount: number;
  warnings: string[];
};

export async function assembleBook(
  composition: Composition,
  entries: CompositionEntryWithCard[],
  authorLabel: string
): Promise<AssembledBook> {
  const template = await loadTemplate();
  const preamble = await loadPreamble();
  const warnings: string[] = [];

  const body = entries
    .map((entry) => {
      switch (entry.kind) {
        case "card": {
          if (!entry.card) {
            warnings.push(`Entry @ position ${entry.position}: card was deleted; skipped.`);
            return `% (missing card)`;
          }
          const namespaced = namespaceLabels(entry.card.content, entry.card.slug);
          return `\\chapter{${texEscape(entry.card.title)}}\n${namespaced}`;
        }
        case "heading": {
          const level = entry.heading_level ?? 1;
          const cmd =
            level <= 0
              ? "part"
              : level === 1
                ? "chapter"
                : level === 2
                  ? "section"
                  : level === 3
                    ? "subsection"
                    : "subsubsection";
          return `\\${cmd}{${texEscape(entry.heading_text ?? "")}}`;
        }
        case "page_break":
          return `\\newpage`;
        case "raw":
          return entry.raw_content ?? "";
        default:
          warnings.push(`Unknown entry kind at position ${entry.position}.`);
          return "";
      }
    })
    .join("\n\n");

  const subtitle = `${prettyKind(composition.kind)} · ${authorLabel}`;
  const tex = template
    .replace("<<TITLE>>", texEscape(composition.title))
    .replace("<<SUBTITLE>>", texEscape(subtitle))
    .replace(
      /% << preamble inlined here at compile time >>/,
      preamble.trim()
    )
    .replace(
      /% << ordered \\input\{cards\/<slug>.tex\} lines inlined here >>/,
      body
    );

  return {
    tex,
    cardCount: entries.filter((e) => e.kind === "card" && e.card).length,
    warnings,
  };
}

function prettyKind(kind: Composition["kind"]): string {
  switch (kind) {
    case "textbook":
      return "Textbook";
    case "cheatsheet":
      return "Cheatsheet";
    case "lecture":
      return "Lecture";
    case "note_pack":
      return "Note pack";
    case "custom":
    default:
      return "Composition";
  }
}
