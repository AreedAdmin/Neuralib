"use server";

import { searchCards, type SearchHit } from "@/lib/db/search";

export async function searchCardsAction(q: string): Promise<SearchHit[]> {
  return searchCards(q, 12);
}
