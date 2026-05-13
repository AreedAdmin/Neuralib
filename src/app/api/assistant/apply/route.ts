import { NextResponse } from "next/server";
import { autosaveCard, createCard } from "@/lib/actions/cards";
import { createLink } from "@/lib/actions/links";
import { createSubject } from "@/lib/actions/subjects";
import { attachTagToCard } from "@/lib/actions/tags";
import {
  buildSubjectTree,
  findSubjectByPath,
  listSubjects,
} from "@/lib/db/subjects";
import { createClient } from "@/lib/supabase/server";
import type { Proposal } from "@/lib/ai/tools";

export const runtime = "nodejs";

type ApplyResponse =
  | { ok: true; result: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Execute a proposal returned earlier by the chat tool layer. The chat itself
 * never writes — only this route does, and only when the user explicitly hits
 * Approve in the UI.
 */
export async function POST(req: Request): Promise<NextResponse<ApplyResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in required." },
      { status: 401 }
    );
  }

  let proposal: Proposal;
  try {
    proposal = (await req.json()) as Proposal;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body must be a Proposal JSON." },
      { status: 400 }
    );
  }

  switch (proposal.action) {
    case "create_subject": {
      const subjects = await listSubjects();
      const tree = buildSubjectTree(subjects);
      let parentId: string | null = null;
      if (proposal.args.parent_slug_path) {
        const parts = proposal.args.parent_slug_path
          .split("/")
          .map((s) => s.trim())
          .filter(Boolean);
        const node = findSubjectByPath(tree, parts);
        if (!node) {
          return NextResponse.json(
            {
              ok: false,
              error: `Parent subject path not found: ${proposal.args.parent_slug_path}`,
            },
            { status: 200 }
          );
        }
        parentId = node.id;
      }
      const res = await createSubject({
        name: proposal.args.name,
        parentId,
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 200 });
      }
      return NextResponse.json({ ok: true, result: { kind: "create_subject" } });
    }

    case "create_card": {
      const subjects = await listSubjects();
      const tree = buildSubjectTree(subjects);
      const parts = proposal.args.subject_slug_path
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
      const node = findSubjectByPath(tree, parts);
      if (!node) {
        return NextResponse.json(
          {
            ok: false,
            error: `Subject path not found: ${proposal.args.subject_slug_path}`,
          },
          { status: 200 }
        );
      }
      const res = await createCard({
        subjectId: node.id,
        title: proposal.args.title,
        content: proposal.args.content,
        format: proposal.args.format,
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 200 });
      }
      return NextResponse.json({
        ok: true,
        result: { kind: "create_card", cardId: res.value.id },
      });
    }

    case "update_card": {
      const res = await autosaveCard({
        id: proposal.args.cardId,
        content: proposal.args.content,
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 200 });
      }
      return NextResponse.json({
        ok: true,
        result: {
          kind: "update_card",
          cardId: proposal.args.cardId,
          savedAt: res.value.savedAt,
          versionCreated: res.value.versionCreated,
        },
      });
    }

    case "add_tag": {
      const res = await attachTagToCard({
        cardId: proposal.args.cardId,
        tagName: proposal.args.tagName,
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 200 });
      }
      return NextResponse.json({
        ok: true,
        result: { kind: "add_tag", cardId: proposal.args.cardId },
      });
    }

    case "link_cards": {
      const res = await createLink({
        sourceCardId: proposal.args.sourceCardId,
        targetCardId: proposal.args.targetCardId,
        kind: proposal.args.kind,
        note: proposal.args.note,
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 200 });
      }
      return NextResponse.json({ ok: true, result: { kind: "link_cards" } });
    }

    default: {
      return NextResponse.json(
        { ok: false, error: `Unknown proposal action.` },
        { status: 400 }
      );
    }
  }
}
