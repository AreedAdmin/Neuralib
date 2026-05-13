/**
 * Hand-curated reference for the assistant's tool surface.
 * Source of truth for /assistant/docs. Keep in sync with src/lib/ai/tools.ts.
 */

export type ToolKind = "read" | "write";

export type ToolParam = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type ToolDoc = {
  name: string;
  kind: ToolKind;
  description: string;
  params: ToolParam[];
  examples: string[];
  /** Optional gotcha / behavioural note. */
  note?: string;
};

export const TOOL_DOCS: ToolDoc[] = [
  // ============================================================================
  // READ TOOLS
  // ============================================================================
  {
    name: "list_subjects",
    kind: "read",
    description:
      "Returns the full subject tree with slug paths. The assistant uses this before proposing a new subject or card so it nests under the right parent.",
    params: [],
    examples: [
      "List my subjects.",
      "What subjects do I have?",
      "Show me the subject tree.",
    ],
  },
  {
    name: "search_cards",
    kind: "read",
    description:
      "Hybrid pgvector + tsvector search across every owned card. Returns up to `limit` results ranked by relevance, with subject path + snippet for each hit.",
    params: [
      { name: "query", type: "string", required: true, description: "Natural-language query." },
      {
        name: "limit",
        type: "integer (1–20)",
        required: false,
        description: "Max number of cards to return (default 8).",
      },
    ],
    examples: [
      "Search my library for PageRank.",
      "Which of my cards mention spectral methods?",
      "Find anything I've written about message-passing GNNs.",
    ],
    note: "Trigram fallback catches typos; semantic search catches paraphrases. Snippets include `<mark>` highlights.",
  },
  {
    name: "read_card",
    kind: "read",
    description:
      "Fetch a card's full LaTeX source by UUID. Used after `search_cards` to inspect a specific card before proposing edits.",
    params: [
      { name: "cardId", type: "uuid", required: true, description: "The card's UUID." },
    ],
    examples: [
      "Read the PageRank card and tell me what's in it.",
      "Show me the source for the spectral-clustering card.",
    ],
  },
  {
    name: "read_links",
    kind: "read",
    description:
      "Return outgoing + incoming See-also links for a card. Useful before proposing new links so duplicates don't pile up.",
    params: [
      { name: "cardId", type: "uuid", required: true, description: "The card's UUID." },
    ],
    examples: [
      "What's connected to the PageRank card?",
      "Show me backlinks for spectral clustering.",
    ],
  },

  // ============================================================================
  // WRITE TOOLS — return pending-approval proposals only
  // ============================================================================
  {
    name: "create_subject",
    kind: "write",
    description:
      "Propose creating a subject. Returns a proposal — the user must click Approve in the chat UI before any DB write happens.",
    params: [
      { name: "name", type: "string", required: true, description: "Display name, e.g. 'Graph Algorithms'." },
      {
        name: "parent_slug_path",
        type: "string",
        required: false,
        description: "Slash-separated slugs to nest under (e.g. 'algorithms'). Omit for top-level.",
      },
    ],
    examples: [
      "Create a new subject called Network Science.",
      "Add a sub-subject 'Random Walks' under Algorithms / Graph Algorithms.",
    ],
  },
  {
    name: "create_card",
    kind: "write",
    description:
      "Propose creating a card with LaTeX content. Always preceded by `list_subjects` so the slug path is correct.",
    params: [
      {
        name: "subject_slug_path",
        type: "string",
        required: true,
        description: "Slug path of the parent subject, e.g. 'algorithms/graph-algorithms'.",
      },
      { name: "title", type: "string", required: true, description: "Card title." },
      {
        name: "content",
        type: "string (LaTeX)",
        required: true,
        description: "Full LaTeX source. Default format is `latex_fragment` (wrapped at compile time).",
      },
      {
        name: "format",
        type: "'latex_fragment' | 'latex_doc'",
        required: false,
        description: "Default `latex_fragment`. Use `latex_doc` only for standalone documents with their own \\documentclass.",
      },
    ],
    examples: [
      "Draft a card on PageRank under algorithms/graph-algorithms.",
      "Write a one-page summary of the perceptron convergence theorem and add it under ml/foundations.",
    ],
    note: "Approving the proposal lands you in the editor for the new card with content prepopulated.",
  },
  {
    name: "update_card",
    kind: "write",
    description:
      "Propose replacing a card's content. A version snapshot is written automatically when the proposal is approved.",
    params: [
      { name: "cardId", type: "uuid", required: true, description: "The card's UUID." },
      {
        name: "content",
        type: "string (LaTeX)",
        required: true,
        description: "Full new LaTeX source — replaces the existing content entirely.",
      },
      {
        name: "message",
        type: "string",
        required: false,
        description: "Short rationale stored on the version row.",
      },
    ],
    examples: [
      "Tighten the proof in my PageRank card.",
      "Add a TikZ figure illustrating message passing to the GNN-overview card.",
    ],
    note: "Replaces, not patches. The previous content stays available via the card's version history.",
  },
  {
    name: "add_tag",
    kind: "write",
    description:
      "Propose tagging a card. The tag is created if it doesn't yet exist; color is auto-assigned from the subject palette.",
    params: [
      { name: "cardId", type: "uuid", required: true, description: "The card's UUID." },
      { name: "tagName", type: "string", required: true, description: "Tag name; auto-created on first use." },
    ],
    examples: [
      "Tag the spectral-clustering card as 'review'.",
      "Add the tag 'foundational' to all my probability cards.",
    ],
  },
  {
    name: "link_cards",
    kind: "write",
    description:
      "Propose adding a See-also link between two cards. Both cards must exist (verify via `search_cards` first).",
    params: [
      { name: "sourceCardId", type: "uuid", required: true, description: "Origin card." },
      { name: "targetCardId", type: "uuid", required: true, description: "Linked card." },
      {
        name: "kind",
        type: "'depends_on' | 'related' | 'extends' | 'cites'",
        required: true,
        description: "Relationship type.",
      },
      { name: "note", type: "string", required: false, description: "Free-text annotation." },
    ],
    examples: [
      "Link PageRank to the eigenvector-centrality card as 'related'.",
      "Mark the spectral-clustering card as depending on the Laplacian-eigenvalues card.",
    ],
  },
];

export const CONVENTIONS = [
  {
    title: "Slug paths over IDs",
    body: "Subjects are referenced by slug paths (e.g. `algorithms/graph-algorithms`); cards by UUID. The assistant calls `search_cards` before claiming a card exists.",
  },
  {
    title: "LaTeX format",
    body: "`latex_fragment` is the default — your card is wrapped at compile time with the bundled preamble (TikZ, ams*, hyperref, cleveref). `latex_doc` is for standalone documents with their own \\documentclass.",
  },
  {
    title: "Proposal / approval contract",
    body: "Read tools execute live and return real data. Write tools never touch the DB — they emit a `pending_approval` proposal in the chat. You explicitly click Approve to apply, Cancel to discard.",
  },
  {
    title: "Multi-step queries",
    body: "The assistant can chain up to 3 tool calls per turn: e.g. `list_subjects` → `search_cards` → `read_card` → propose. It won't loop endlessly even if the model wants to.",
  },
];

export const BOUNDARIES = [
  "No shell, no internet, no external services. The model can only see what's in your library.",
  "Row-level security scopes every tool result to your own data. The assistant cannot reach other users' content.",
  "Write tools always require approval. There is no `delete_card` / `delete_subject` tool — destructive actions stay in the UI.",
  "No fine-tuning. Pure retrieval-augmented generation over your existing notes.",
];
