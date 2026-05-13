/**
 * Source of truth describing what's already loaded by templates/preamble.tex.
 * Consumed by the system prompt (so the model doesn't redundantly \usepackage
 * things) and the docs page (so the user can see the same info).
 */

export type PreambleGroup = {
  title: string;
  description?: string;
  items: string[];
};

export type BrandMacro = {
  name: string;
  description: string;
};

export type Limitation = {
  thing: string;
  why: string;
};

export const PREAMBLE_BUNDLE: {
  packages: PreambleGroup[];
  tikzLibraries: string[];
  theoremEnvs: Array<{ envs: string[]; style: string }>;
  brandColors: string[];
  brandMacros: BrandMacro[];
  geometry: string;
  notAvailable: Limitation[];
} = {
  packages: [
    {
      title: "Math",
      items: ["amsmath", "amssymb", "amsthm", "mathtools"],
    },
    {
      title: "Diagrams & plots",
      items: ["tikz", "pgfplots (compat=1.18)", "tikz-cd"],
    },
    {
      title: "References & links",
      items: ["hyperref (hidelinks)", "cleveref"],
    },
    {
      title: "Type & layout",
      items: ["lmodern", "microtype", "fontenc T1", "inputenc utf8"],
    },
    {
      title: "Color",
      items: ["xcolor", "Daylight Study brand colors (below)"],
    },
  ],
  tikzLibraries: [
    "graphs",
    "arrows.meta",
    "positioning",
    "calc",
    "decorations.pathreplacing",
    "shapes",
    "shapes.geometric",
    "quotes",
    "fit",
    "matrix",
  ],
  theoremEnvs: [
    { envs: ["definition", "example"], style: "definition (numbered, shared counter)" },
    {
      envs: ["theorem", "lemma", "proposition", "corollary"],
      style: "plain (numbered, shared counter)",
    },
    { envs: ["remark", "note"], style: "remark (unnumbered)" },
  ],
  brandColors: [
    "neuroink",
    "neurocoral",
    "neuromuted",
    "neurosky",
    "neuromint",
    "neurosunshine",
    "neurocream",
  ],
  brandMacros: [
    {
      name: "\\neurolibLogo[scale]",
      description: "Open-book + knowledge-graph logo, drawn in TikZ. Optional scale arg.",
    },
    {
      name: "\\neurolibCover{title}{subtitle}",
      description:
        "Inserted automatically by the compile pipeline on every PDF. Do NOT call manually inside card content — duplicate covers will result.",
    },
  ],
  geometry: "a4paper, 1in margin, parskip=0.6em, parindent=0pt",
  notAvailable: [
    {
      thing: "\\usegdlibrary{layered, force, trees}",
      why: "TikZ graph-drawing libraries require LuaTeX. Tectonic uses XeTeX. Position graph nodes manually via `positioning` / `calc` instead.",
    },
    {
      thing: "Custom \\usepackage{...}",
      why: "Card content is wrapped at compile time with the bundled preamble. Adding \\usepackage in a `latex_fragment` card has no effect; switch to `latex_doc` only if you genuinely need a different preamble.",
    },
  ],
};

/**
 * Compact bullet list rendered into the system prompt so the model stays
 * grounded in what's actually available without dragging the prompt to
 * encyclopedia size.
 */
export function preambleBlockForPrompt(): string {
  const pkgs = PREAMBLE_BUNDLE.packages
    .map((g) => `${g.title}: ${g.items.join(", ")}`)
    .join("\n  - ");
  const thms = PREAMBLE_BUNDLE.theoremEnvs
    .map((g) => `${g.envs.join(", ")} (${g.style})`)
    .join("; ");
  const limits = PREAMBLE_BUNDLE.notAvailable
    .map((l) => `${l.thing} — ${l.why}`)
    .join("\n  - ");

  return `# Bundled preamble (already loaded — do NOT add \\usepackage in latex_fragment cards)

- ${pkgs}
- TikZ libraries: ${PREAMBLE_BUNDLE.tikzLibraries.join(", ")}
- Theorem environments (drop-in): ${thms}
- Brand colors (xcolor): ${PREAMBLE_BUNDLE.brandColors.join(", ")}
- Brand macros: ${PREAMBLE_BUNDLE.brandMacros
    .map((m) => `${m.name} — ${m.description}`)
    .join("; ")}
- Geometry: ${PREAMBLE_BUNDLE.geometry}

## Not available
  - ${limits}`;
}
