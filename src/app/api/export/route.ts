import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Whole-library JSON export.
 * RLS already scopes everything to auth.uid(), so a plain SELECT-* is safe.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const [
    subjects,
    cards,
    cardVersions,
    tags,
    cardTags,
    cardLinks,
    compositions,
    compositionEntries,
  ] = await Promise.all([
    supabase.from("subjects").select("*"),
    supabase.from("cards").select("*"),
    supabase.from("card_versions").select("*"),
    supabase.from("tags").select("*"),
    supabase.from("card_tags").select("*"),
    supabase.from("card_links").select("*"),
    supabase.from("compositions").select("*"),
    supabase.from("composition_entries").select("*"),
  ]);

  for (const r of [
    subjects,
    cards,
    cardVersions,
    tags,
    cardTags,
    cardLinks,
    compositions,
    compositionEntries,
  ]) {
    if (r.error) {
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }
  }

  const payload = {
    schema: "neuralib",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    ownerId: user.id,
    ownerEmail: user.email,
    subjects: subjects.data ?? [],
    cards: cards.data ?? [],
    cardVersions: cardVersions.data ?? [],
    tags: tags.data ?? [],
    cardTags: cardTags.data ?? [],
    cardLinks: cardLinks.data ?? [],
    compositions: compositions.data ?? [],
    compositionEntries: compositionEntries.data ?? [],
  };

  const filename = `neurolib-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
