import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippetCompletion,
} from "@codemirror/autocomplete";

const plain = (
  label: string,
  type: Completion["type"],
  detail?: string
): Completion => ({ label, type, detail });

const snip = (
  template: string,
  label: string,
  type: Completion["type"],
  detail?: string
): Completion => snippetCompletion(template, { label, type, detail });

const greek: Completion[] = [
  plain("\\alpha", "constant", "α"),
  plain("\\beta", "constant", "β"),
  plain("\\gamma", "constant", "γ"),
  plain("\\delta", "constant", "δ"),
  plain("\\epsilon", "constant", "ε"),
  plain("\\varepsilon", "constant", "ɛ"),
  plain("\\zeta", "constant", "ζ"),
  plain("\\eta", "constant", "η"),
  plain("\\theta", "constant", "θ"),
  plain("\\vartheta", "constant", "ϑ"),
  plain("\\iota", "constant", "ι"),
  plain("\\kappa", "constant", "κ"),
  plain("\\lambda", "constant", "λ"),
  plain("\\mu", "constant", "μ"),
  plain("\\nu", "constant", "ν"),
  plain("\\xi", "constant", "ξ"),
  plain("\\pi", "constant", "π"),
  plain("\\varpi", "constant", "ϖ"),
  plain("\\rho", "constant", "ρ"),
  plain("\\varrho", "constant", "ϱ"),
  plain("\\sigma", "constant", "σ"),
  plain("\\varsigma", "constant", "ς"),
  plain("\\tau", "constant", "τ"),
  plain("\\upsilon", "constant", "υ"),
  plain("\\phi", "constant", "φ"),
  plain("\\varphi", "constant", "ϕ"),
  plain("\\chi", "constant", "χ"),
  plain("\\psi", "constant", "ψ"),
  plain("\\omega", "constant", "ω"),
  plain("\\Gamma", "constant", "Γ"),
  plain("\\Delta", "constant", "Δ"),
  plain("\\Theta", "constant", "Θ"),
  plain("\\Lambda", "constant", "Λ"),
  plain("\\Xi", "constant", "Ξ"),
  plain("\\Pi", "constant", "Π"),
  plain("\\Sigma", "constant", "Σ"),
  plain("\\Upsilon", "constant", "Υ"),
  plain("\\Phi", "constant", "Φ"),
  plain("\\Psi", "constant", "Ψ"),
  plain("\\Omega", "constant", "Ω"),
];

const operators: Completion[] = [
  plain("\\sum", "function", "summation"),
  plain("\\prod", "function", "product"),
  plain("\\int", "function", "integral"),
  plain("\\iint", "function", "double integral"),
  plain("\\iiint", "function", "triple integral"),
  plain("\\oint", "function", "contour integral"),
  plain("\\lim", "function", "limit"),
  plain("\\sup", "function", "supremum"),
  plain("\\inf", "function", "infimum"),
  plain("\\max", "function"),
  plain("\\min", "function"),
  plain("\\log", "function"),
  plain("\\ln", "function"),
  plain("\\exp", "function"),
  plain("\\sin", "function"),
  plain("\\cos", "function"),
  plain("\\tan", "function"),
  plain("\\arcsin", "function"),
  plain("\\arccos", "function"),
  plain("\\arctan", "function"),
  plain("\\sinh", "function"),
  plain("\\cosh", "function"),
  plain("\\tanh", "function"),
];

const relations: Completion[] = [
  plain("\\leq", "constant", "≤"),
  plain("\\geq", "constant", "≥"),
  plain("\\neq", "constant", "≠"),
  plain("\\approx", "constant", "≈"),
  plain("\\equiv", "constant", "≡"),
  plain("\\sim", "constant", "∼"),
  plain("\\simeq", "constant", "≃"),
  plain("\\cong", "constant", "≅"),
  plain("\\propto", "constant", "∝"),
  plain("\\in", "constant", "∈"),
  plain("\\notin", "constant", "∉"),
  plain("\\ni", "constant", "∋"),
  plain("\\subset", "constant", "⊂"),
  plain("\\supset", "constant", "⊃"),
  plain("\\subseteq", "constant", "⊆"),
  plain("\\supseteq", "constant", "⊇"),
  plain("\\cup", "constant", "∪"),
  plain("\\cap", "constant", "∩"),
  plain("\\setminus", "constant", "∖"),
];

const arrows: Completion[] = [
  plain("\\to", "constant", "→"),
  plain("\\rightarrow", "constant", "→"),
  plain("\\leftarrow", "constant", "←"),
  plain("\\Rightarrow", "constant", "⇒"),
  plain("\\Leftarrow", "constant", "⇐"),
  plain("\\Leftrightarrow", "constant", "⇔"),
  plain("\\leftrightarrow", "constant", "↔"),
  plain("\\mapsto", "constant", "↦"),
  plain("\\uparrow", "constant", "↑"),
  plain("\\downarrow", "constant", "↓"),
];

const symbols: Completion[] = [
  plain("\\infty", "constant", "∞"),
  plain("\\partial", "constant", "∂"),
  plain("\\nabla", "constant", "∇"),
  plain("\\forall", "constant", "∀"),
  plain("\\exists", "constant", "∃"),
  plain("\\nexists", "constant", "∄"),
  plain("\\emptyset", "constant", "∅"),
  plain("\\varnothing", "constant", "∅"),
  plain("\\cdot", "constant", "·"),
  plain("\\cdots", "constant", "⋯"),
  plain("\\ldots", "constant", "…"),
  plain("\\times", "constant", "×"),
  plain("\\div", "constant", "÷"),
  plain("\\pm", "constant", "±"),
  plain("\\mp", "constant", "∓"),
  plain("\\circ", "constant", "∘"),
  plain("\\star", "constant", "⋆"),
  plain("\\dagger", "constant", "†"),
  plain("\\ddagger", "constant", "‡"),
  plain("\\hbar", "constant", "ℏ"),
  plain("\\ell", "constant", "ℓ"),
  plain("\\Re", "constant", "ℜ"),
  plain("\\Im", "constant", "ℑ"),
  plain("\\aleph", "constant", "ℵ"),
];

const snippets: Completion[] = [
  snip("\\frac{${1:num}}{${2:den}}", "\\frac", "function", "fraction"),
  snip("\\dfrac{${1:num}}{${2:den}}", "\\dfrac", "function", "display fraction"),
  snip("\\sqrt{${1:x}}", "\\sqrt", "function", "square root"),
  snip("\\sqrt[${1:n}]{${2:x}}", "\\sqrt[n]", "function", "n-th root"),
  snip("\\binom{${1:n}}{${2:k}}", "\\binom", "function", "binomial coefficient"),
  snip("\\overline{${1}}", "\\overline", "function"),
  snip("\\underline{${1}}", "\\underline", "function"),
  snip("\\widehat{${1}}", "\\widehat", "function"),
  snip("\\widetilde{${1}}", "\\widetilde", "function"),
  snip("\\vec{${1}}", "\\vec", "function"),
  snip("\\hat{${1}}", "\\hat", "function"),
  snip("\\bar{${1}}", "\\bar", "function"),
  snip("\\dot{${1}}", "\\dot", "function"),
  snip("\\ddot{${1}}", "\\ddot", "function"),
  snip("\\textbf{${1:text}}", "\\textbf", "function", "bold"),
  snip("\\textit{${1:text}}", "\\textit", "function", "italic"),
  snip("\\emph{${1:text}}", "\\emph", "function", "emphasis"),
  snip("\\texttt{${1:text}}", "\\texttt", "function", "typewriter"),
  snip("\\textsf{${1:text}}", "\\textsf", "function", "sans-serif"),
  snip("\\mathbb{${1:R}}", "\\mathbb", "function", "blackboard bold"),
  snip("\\mathcal{${1}}", "\\mathcal", "function", "calligraphic"),
  snip("\\mathfrak{${1}}", "\\mathfrak", "function", "fraktur"),
  snip("\\mathrm{${1}}", "\\mathrm", "function", "roman"),
  snip("\\mathbf{${1}}", "\\mathbf", "function", "math bold"),
  snip("\\section{${1:title}}", "\\section", "keyword"),
  snip("\\subsection{${1:title}}", "\\subsection", "keyword"),
  snip("\\subsubsection{${1:title}}", "\\subsubsection", "keyword"),
  snip("\\paragraph{${1:title}}", "\\paragraph", "keyword"),
  snip("\\chapter{${1:title}}", "\\chapter", "keyword"),
  snip("\\label{${1:key}}", "\\label", "keyword"),
  snip("\\ref{${1:key}}", "\\ref", "keyword"),
  snip("\\eqref{${1:key}}", "\\eqref", "keyword"),
  snip("\\cite{${1:key}}", "\\cite", "keyword"),
  snip("\\footnote{${1:text}}", "\\footnote", "keyword"),
  snip("\\href{${1:url}}{${2:text}}", "\\href", "keyword"),
  snip("\\url{${1:url}}", "\\url", "keyword"),
  snip("\\item ${1}", "\\item", "keyword", "list item"),
  snip(
    "\\begin{equation}\n\t${1}\n\\end{equation}",
    "\\begin{equation}",
    "type",
    "numbered equation"
  ),
  snip(
    "\\begin{equation*}\n\t${1}\n\\end{equation*}",
    "\\begin{equation*}",
    "type",
    "unnumbered equation"
  ),
  snip(
    "\\begin{align}\n\t${1} &= ${2} \\\\\\\\\n\t&= ${3}\n\\end{align}",
    "\\begin{align}",
    "type",
    "aligned equations"
  ),
  snip(
    "\\begin{align*}\n\t${1} &= ${2}\n\\end{align*}",
    "\\begin{align*}",
    "type",
    "unnumbered align"
  ),
  snip(
    "\\begin{matrix}\n\t${1:a} & ${2:b} \\\\\\\\\n\t${3:c} & ${4:d}\n\\end{matrix}",
    "\\begin{matrix}",
    "type"
  ),
  snip(
    "\\begin{pmatrix}\n\t${1:a} & ${2:b} \\\\\\\\\n\t${3:c} & ${4:d}\n\\end{pmatrix}",
    "\\begin{pmatrix}",
    "type",
    "( ) matrix"
  ),
  snip(
    "\\begin{bmatrix}\n\t${1:a} & ${2:b} \\\\\\\\\n\t${3:c} & ${4:d}\n\\end{bmatrix}",
    "\\begin{bmatrix}",
    "type",
    "[ ] matrix"
  ),
  snip(
    "\\begin{vmatrix}\n\t${1:a} & ${2:b} \\\\\\\\\n\t${3:c} & ${4:d}\n\\end{vmatrix}",
    "\\begin{vmatrix}",
    "type",
    "determinant"
  ),
  snip(
    "\\begin{cases}\n\t${1:a} & \\text{if } ${2:cond} \\\\\\\\\n\t${3:b} & \\text{otherwise}\n\\end{cases}",
    "\\begin{cases}",
    "type",
    "piecewise"
  ),
  snip(
    "\\begin{itemize}\n\t\\item ${1}\n\\end{itemize}",
    "\\begin{itemize}",
    "type",
    "bullet list"
  ),
  snip(
    "\\begin{enumerate}\n\t\\item ${1}\n\\end{enumerate}",
    "\\begin{enumerate}",
    "type",
    "numbered list"
  ),
  snip(
    "\\begin{description}\n\t\\item[${1:term}] ${2:def}\n\\end{description}",
    "\\begin{description}",
    "type"
  ),
  snip(
    "\\begin{figure}[${1:htbp}]\n\t\\centering\n\t\\includegraphics[width=${2:0.8}\\textwidth]{${3:file}}\n\t\\caption{${4:caption}}\n\t\\label{fig:${5:key}}\n\\end{figure}",
    "\\begin{figure}",
    "type"
  ),
  snip(
    "\\begin{table}[${1:htbp}]\n\t\\centering\n\t\\begin{tabular}{${2:ccc}}\n\t\t${3}\n\t\\end{tabular}\n\t\\caption{${4:caption}}\n\t\\label{tab:${5:key}}\n\\end{table}",
    "\\begin{table}",
    "type"
  ),
  snip(
    "\\begin{tabular}{${1:ccc}}\n\t${2}\n\\end{tabular}",
    "\\begin{tabular}",
    "type"
  ),
  snip(
    "\\begin{proof}\n\t${1}\n\\end{proof}",
    "\\begin{proof}",
    "type"
  ),
  snip(
    "\\begin{theorem}\n\t${1}\n\\end{theorem}",
    "\\begin{theorem}",
    "type"
  ),
  snip(
    "\\begin{lemma}\n\t${1}\n\\end{lemma}",
    "\\begin{lemma}",
    "type"
  ),
  snip(
    "\\begin{definition}\n\t${1}\n\\end{definition}",
    "\\begin{definition}",
    "type"
  ),
  snip(
    "\\begin{${1:env}}\n\t${2}\n\\end{${1:env}}",
    "\\begin{...}",
    "type",
    "custom environment"
  ),
];

const documentCommands: Completion[] = [
  plain("\\maketitle", "keyword"),
  plain("\\tableofcontents", "keyword"),
  plain("\\newpage", "keyword"),
  plain("\\pagebreak", "keyword"),
  plain("\\linebreak", "keyword"),
  plain("\\noindent", "keyword"),
  plain("\\hfill", "keyword"),
  plain("\\vfill", "keyword"),
  plain("\\centering", "keyword"),
  plain("\\medskip", "keyword"),
  plain("\\bigskip", "keyword"),
  plain("\\smallskip", "keyword"),
  plain("\\quad", "keyword"),
  plain("\\qquad", "keyword"),
  plain("\\,", "keyword", "thin space"),
  plain("\\!", "keyword", "negative thin space"),
  plain("\\left", "keyword"),
  plain("\\right", "keyword"),
];

const allCompletions: Completion[] = [
  ...greek,
  ...operators,
  ...relations,
  ...arrows,
  ...symbols,
  ...documentCommands,
  ...snippets,
];

export function latexCompletions(
  context: CompletionContext
): CompletionResult | null {
  const word = context.matchBefore(/\\[a-zA-Z*]*/);
  if (!word) return null;
  if (word.from === word.to && !context.explicit) return null;
  return {
    from: word.from,
    options: allCompletions,
    validFor: /^\\[a-zA-Z*]*$/,
  };
}
