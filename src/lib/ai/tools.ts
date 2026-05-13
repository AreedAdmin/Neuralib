import { tool } from "ai";
import { z } from "zod";
import { embedQuery } from "@/lib/ai/embed";
import { listLinksForCard } from "@/lib/db/links";
import {
  buildSubjectTree,
  listSubjects,
  pathFor,
  type SubjectNode,
} from "@/lib/db/subjects";
import { createClient } from "@/lib/supabase/server";

/** Shape proposals consistently so the chat UI can render an Approve/Cancel card. */
export type Proposal =
  | {
      status: "pending_approval";
      action: "create_subject";
      args: { name: string; parent_slug_path?: string };
    }
  | {
      status: "pending_approval";
      action: "create_card";
      args: {
        subject_slug_path: string;
        title: string;
        content: string;
        format?: "latex_fragment" | "latex_doc";
      };
    }
  | {
      status: "pending_approval";
      action: "update_card";
      args: { cardId: string; content: string; message?: string };
    }
  | {
      status: "pending_approval";
      action: "add_tag";
      args: { cardId: string; tagName: string };
    }
  | {
      status: "pending_approval";
      action: "link_cards";
      args: {
        sourceCardId: string;
        targetCardId: string;
        kind: "depends_on" | "related" | "extends" | "cites";
        note?: string;
      };
    };

type SerializedNode = {
  id: string;
  name: string;
  slugPath: string;
  children: SerializedNode[];
};

function serializeTree(roots: SubjectNode[], parentPath: string[] = []): SerializedNode[] {
  return roots.map((node) => {
    const path = [...parentPath, node.slug];
    return {
      id: node.id,
      name: node.name,
      slugPath: path.join("/"),
      children: serializeTree(node.children, path),
    };
  });
}

function stripMarkTags(s: string): string {
  return s.replace(/<\/?mark>/g, "");
}

export const tools = {
  // ============================================================================
  // READ TOOLS — execute immediately
  // ============================================================================

  list_subjects: tool({
    description:
      "List the user's full subject tree with slug paths. Always call this before proposing a new subject or card so you nest under the right parent.",
    parameters: z.object({}),
    execute: async () => {
      const subjects = await listSubjects();
      const tree = buildSubjectTree(subjects);
      return { tree: serializeTree(tree) };
    },
  }),

  search_cards: tool({
    description:
      "Hybrid semantic + keyword search over the user's cards. Returns up to `limit` results ranked by relevance. Use this whenever the user references a card by topic rather than a specific UUID.",
    parameters: z.object({
      query: z.string().describe("Natural-language query"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Max number of cards to return (default 8)"),
    }),
    execute: async ({ query, limit }) => {
      const supabase = await createClient();
      let qVec: number[];
      try {
        qVec = await embedQuery(query);
      } catch (err) {
        return {
          hits: [],
          error: err instanceof Error ? err.message : String(err),
        };
      }
      const vecLiteral = `[${qVec.join(",")}]`;
      const { data, error } = await supabase.rpc("search_cards_hybrid", {
        q: query,
        q_embedding: vecLiteral as unknown as string,
        lim: limit ?? 8,
      });
      if (error) return { hits: [], error: error.message };
      const subjects = await listSubjects();
      return {
        hits: (data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          subjectPath: pathFor(subjects, row.subject_id).join("/"),
          rank: row.rank,
          snippet: stripMarkTags(row.snippet ?? ""),
        })),
      };
    },
  }),

  read_card: tool({
    description:
      "Fetch a card's full LaTeX source by UUID. Call this after `search_cards` to inspect a specific card before proposing edits.",
    parameters: z.object({ cardId: z.string().uuid() }),
    execute: async ({ cardId }) => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("cards")
        .select("id, title, slug, content, format, status, subject_id")
        .eq("id", cardId)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Card not found." };
      const subjects = await listSubjects();
      return {
        id: data.id,
        title: data.title,
        slug: data.slug,
        format: data.format,
        status: data.status,
        subjectPath: pathFor(subjects, data.subject_id).join("/"),
        content: data.content,
      };
    },
  }),

  read_links: tool({
    description:
      "Fetch outgoing + incoming See-also links for a card. Useful before proposing new links so you don't duplicate.",
    parameters: z.object({ cardId: z.string().uuid() }),
    execute: async ({ cardId }) => {
      const { outgoing, incoming } = await listLinksForCard(cardId);
      const flatten = (arr: typeof outgoing) =>
        arr.map((l) => ({
          linkId: l.linkId,
          kind: l.kind,
          card: { id: l.card.id, title: l.card.title, slug: l.card.slug },
          note: l.note,
        }));
      return {
        outgoing: flatten(outgoing),
        incoming: flatten(incoming),
      };
    },
  }),

  // ============================================================================
  // WRITE TOOLS — return pending-approval proposals only
  // ============================================================================

  create_subject: tool({
    description:
      "Propose creating a subject. Does NOT execute — returns `{ status: 'pending_approval', action: 'create_subject', args }`. The user must approve in the UI.",
    parameters: z.object({
      name: z.string().describe("Display name, e.g. 'Graph Algorithms'"),
      parent_slug_path: z
        .string()
        .optional()
        .describe(
          "Slash-separated slugs to nest under (e.g. 'algorithms'). Omit for a top-level subject."
        ),
    }),
    execute: async (args): Promise<Proposal> => ({
      status: "pending_approval",
      action: "create_subject",
      args,
    }),
  }),

  create_card: tool({
    description:
      "Propose creating a card with LaTeX content. Does NOT execute. Always call `list_subjects` first so the slug path is correct.",
    parameters: z.object({
      subject_slug_path: z
        .string()
        .describe("Slug path of the parent subject, e.g. 'algorithms/graph-algorithms'"),
      title: z.string(),
      content: z
        .string()
        .describe("Full LaTeX source. Use `latex_fragment` unless format is `latex_doc`."),
      format: z
        .enum(["latex_fragment", "latex_doc"])
        .optional()
        .describe("Default: latex_fragment (wrapped at compile time)."),
    }),
    execute: async (args): Promise<Proposal> => ({
      status: "pending_approval",
      action: "create_card",
      args,
    }),
  }),

  update_card: tool({
    description:
      "Propose replacing a card's content. Does NOT execute. A version snapshot is written when applied.",
    parameters: z.object({
      cardId: z.string().uuid(),
      content: z.string().describe("Full new LaTeX source — replaces the existing content."),
      message: z
        .string()
        .optional()
        .describe("Short rationale stored on the version row (optional)"),
    }),
    execute: async (args): Promise<Proposal> => ({
      status: "pending_approval",
      action: "update_card",
      args,
    }),
  }),

  add_tag: tool({
    description: "Propose adding a tag to a card. Does NOT execute.",
    parameters: z.object({
      cardId: z.string().uuid(),
      tagName: z.string().describe("Tag name; will be created if it doesn't exist."),
    }),
    execute: async (args): Promise<Proposal> => ({
      status: "pending_approval",
      action: "add_tag",
      args,
    }),
  }),

  link_cards: tool({
    description: "Propose adding a See-also link between two cards. Does NOT execute.",
    parameters: z.object({
      sourceCardId: z.string().uuid(),
      targetCardId: z.string().uuid(),
      kind: z.enum(["depends_on", "related", "extends", "cites"]),
      note: z.string().optional(),
    }),
    execute: async (args): Promise<Proposal> => ({
      status: "pending_approval",
      action: "link_cards",
      args,
    }),
  }),
};

export type ToolName = keyof typeof tools;
