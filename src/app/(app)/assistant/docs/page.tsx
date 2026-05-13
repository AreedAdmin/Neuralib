import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Eye,
  FileCode,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  BOUNDARIES,
  CONVENTIONS,
  TOOL_DOCS,
  type ToolDoc,
} from "@/lib/ai/tool-docs";
import { PREAMBLE_BUNDLE } from "@/lib/ai/preamble-info";
import { CHAT_MODEL, EMBED_MODEL } from "@/lib/ai/ollama";

export default function AssistantDocsPage() {
  const reads = TOOL_DOCS.filter((t) => t.kind === "read");
  const writes = TOOL_DOCS.filter((t) => t.kind === "write");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-8 py-10">
      <header className="flex flex-col gap-3">
        <Link
          href="/assistant"
          className="flex w-fit items-center gap-1 text-xs text-(--color-ink-muted) no-underline hover:text-(--color-ink)"
        >
          <ArrowLeft className="size-3.5" /> Back to chat
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-(--radius-md) bg-(--color-coral-soft) text-(--color-coral)">
            <Bot className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-(--color-coral)">
              Reference
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-(--color-ink)">
              AI assistant capabilities
            </h1>
          </div>
        </div>
        <p className="max-w-2xl text-(--color-ink-muted)">
          Everything Neurolib&rsquo;s local assistant can do, with parameters and
          example phrasings. Read tools execute live; write tools surface a
          proposal you approve in the chat.
        </p>
        <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-(--color-ink-muted)">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-(--color-coral)" />
            <dt className="font-medium">Chat model:</dt>
            <dd className="font-mono text-(--color-ink)">{CHAT_MODEL}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-(--color-sky)" />
            <dt className="font-medium">Embed model:</dt>
            <dd className="font-mono text-(--color-ink)">{EMBED_MODEL}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="font-medium">Backend:</dt>
            <dd>Ollama (local)</dd>
          </div>
        </dl>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          Conventions
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONVENTIONS.map((c) => (
            <article
              key={c.title}
              className="rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) p-4 shadow-(--shadow-soft)"
            >
              <h3 className="text-sm font-semibold text-(--color-ink)">{c.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-(--color-ink-muted)">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          <Eye className="size-3.5 text-(--color-mint)" />
          Read tools — execute live
        </h2>
        <div className="flex flex-col gap-3">
          {reads.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          <Pencil className="size-3.5 text-(--color-coral)" />
          Write tools — propose only
        </h2>
        <p className="-mt-1 max-w-2xl text-xs text-(--color-ink-muted)">
          These never touch your library directly. The model returns a proposal;
          you click <span className="font-medium text-(--color-coral)">Approve</span> in the
          chat to apply, or <span className="font-medium">Cancel</span> to discard.
        </p>
        <div className="flex flex-col gap-3">
          {writes.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          <FileCode className="size-3.5 text-(--color-sky)" />
          Bundled preamble
        </h2>
        <p className="-mt-1 max-w-2xl text-xs text-(--color-ink-muted)">
          What&rsquo;s pre-loaded for every <code className="rounded bg-(--color-cream-3) px-1 py-0.5 font-mono text-[11px]">latex_fragment</code> card.
          The assistant knows about all of this — it won&rsquo;t add redundant{" "}
          <code className="rounded bg-(--color-cream-3) px-1 py-0.5 font-mono text-[11px]">\usepackage</code>{" "}
          lines or reach for libraries that aren&rsquo;t loaded.
        </p>

        <article className="rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) shadow-(--shadow-soft)">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2">
            {PREAMBLE_BUNDLE.packages.map((g) => (
              <PreambleGroup key={g.title} title={g.title} items={g.items} />
            ))}
          </div>

          <div className="border-t border-(--color-edge) px-4 py-3">
            <h4 className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
              TikZ libraries
            </h4>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PREAMBLE_BUNDLE.tikzLibraries.map((lib) => (
                <code
                  key={lib}
                  className="rounded-(--radius-xs) bg-(--color-cream-3) px-2 py-0.5 font-mono text-xs text-(--color-ink)"
                >
                  {lib}
                </code>
              ))}
            </div>
          </div>

          <div className="border-t border-(--color-edge) px-4 py-3">
            <h4 className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
              Theorem environments
            </h4>
            <ul className="mt-1.5 flex flex-col gap-1 text-xs text-(--color-ink-muted)">
              {PREAMBLE_BUNDLE.theoremEnvs.map((g, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="font-mono text-(--color-ink)">
                    {g.envs.join(", ")}
                  </span>
                  <span className="text-[11px]">— {g.style}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-(--color-edge) px-4 py-3">
            <h4 className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
              Daylight Study brand colors
            </h4>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PREAMBLE_BUNDLE.brandColors.map((c) => (
                <span
                  key={c}
                  className="flex items-center gap-1.5 rounded-full border border-(--color-edge) bg-(--color-cream-3) px-2 py-0.5 font-mono text-xs text-(--color-ink)"
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full border border-(--color-edge)"
                    style={{ backgroundColor: tokenForColor(c) }}
                  />
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-(--color-edge) px-4 py-3">
            <h4 className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
              Brand macros
            </h4>
            <ul className="mt-1.5 flex flex-col gap-1.5 text-xs">
              {PREAMBLE_BUNDLE.brandMacros.map((m) => (
                <li key={m.name} className="flex flex-col gap-0.5">
                  <code className="font-mono text-(--color-ink)">{m.name}</code>
                  <span className="text-[11px] text-(--color-ink-muted)">
                    {m.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-(--color-edge) px-4 py-3 text-xs text-(--color-ink-muted)">
            <span className="font-medium text-(--color-ink-muted)">Geometry: </span>
            {PREAMBLE_BUNDLE.geometry}
          </div>

          <div className="border-t border-(--color-edge) bg-[color-mix(in_oklab,var(--color-warning),white_85%)] px-4 py-3">
            <h4 className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
              <X className="size-3 text-(--color-coral)" /> Not available
            </h4>
            <ul className="mt-1.5 flex flex-col gap-1.5 text-xs">
              {PREAMBLE_BUNDLE.notAvailable.map((l) => (
                <li key={l.thing} className="flex flex-col gap-0.5">
                  <code className="font-mono text-(--color-ink)">{l.thing}</code>
                  <span className="text-[11px] text-(--color-ink-muted)">{l.why}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
          <AlertCircle className="size-3.5 text-(--color-warning)" />
          Boundaries
        </h2>
        <ul className="flex flex-col gap-2 rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) p-4 shadow-(--shadow-soft)">
          {BOUNDARIES.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-(--color-ink-muted)"
            >
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-(--color-ink-muted)" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function PreambleGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
        {title}
      </h4>
      <ul className="flex flex-wrap gap-1">
        {items.map((it) => (
          <li
            key={it}
            className="rounded-(--radius-xs) bg-(--color-cream-3) px-2 py-0.5 font-mono text-[11px] text-(--color-ink)"
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Map LaTeX color name → CSS color so we can swatch it next to the label. */
function tokenForColor(name: string): string {
  switch (name) {
    case "neuroink":
      return "var(--color-ink)";
    case "neurocoral":
      return "var(--color-coral)";
    case "neuromuted":
      return "var(--color-ink-muted)";
    case "neurosky":
      return "var(--color-sky)";
    case "neuromint":
      return "var(--color-mint)";
    case "neurosunshine":
      return "var(--color-sunshine)";
    case "neurocream":
      return "var(--color-cream-2)";
    default:
      return "var(--color-ink-muted)";
  }
}

function ToolCard({ tool }: { tool: ToolDoc }) {
  const isRead = tool.kind === "read";
  return (
    <article className="rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) shadow-(--shadow-soft)">
      <header className="flex flex-wrap items-center gap-2 border-b border-(--color-edge) px-4 py-2.5">
        <code className="font-mono text-sm font-semibold text-(--color-ink)">
          {tool.name}
        </code>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: isRead
              ? "color-mix(in oklab, var(--color-mint), white 78%)"
              : "color-mix(in oklab, var(--color-coral), white 78%)",
            color: isRead ? "var(--color-mint)" : "var(--color-coral)",
          }}
        >
          {isRead ? "read" : "write · proposal"}
        </span>
      </header>

      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="text-sm text-(--color-ink-muted)">{tool.description}</p>

        {tool.params.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <h4 className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
              Parameters
            </h4>
            <table className="w-full text-xs">
              <tbody>
                {tool.params.map((p) => (
                  <tr key={p.name} className="border-b border-(--color-edge) last:border-0">
                    <td className="w-1/4 py-1.5 align-top">
                      <code className="font-mono text-(--color-ink)">{p.name}</code>
                      {p.required ? (
                        <span className="ml-1 text-[10px] font-medium text-(--color-coral)">
                          *
                        </span>
                      ) : null}
                    </td>
                    <td className="w-1/4 py-1.5 align-top">
                      <code className="font-mono text-[11px] text-(--color-ink-muted)">
                        {p.type}
                      </code>
                    </td>
                    <td className="py-1.5 align-top text-(--color-ink-muted)">
                      {p.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tool.params.some((p) => p.required) ? (
              <p className="text-[10px] text-(--color-ink-muted)">
                <span className="text-(--color-coral)">*</span> required
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-(--color-ink-muted)">No parameters.</p>
        )}

        <div className="flex flex-col gap-1.5">
          <h4 className="text-[10px] font-medium uppercase tracking-[0.16em] text-(--color-ink-muted)">
            Try saying
          </h4>
          <ul className="flex flex-col gap-1">
            {tool.examples.map((ex) => (
              <li
                key={ex}
                className="rounded-(--radius-xs) bg-(--color-cream-3) px-3 py-1.5 text-xs italic text-(--color-ink)"
              >
                &ldquo;{ex}&rdquo;
              </li>
            ))}
          </ul>
        </div>

        {tool.note ? (
          <div className="flex items-start gap-2 rounded-(--radius-xs) bg-(--color-sky-soft) px-3 py-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-(--color-sky)" />
            <p className="text-xs text-(--color-ink)">{tool.note}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
