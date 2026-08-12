import type { SearchDocument } from "./types.ts";
import type { SearchMatch } from "./match.ts";

/**
 * Deterministic sort, never randomness -- running this twice against the
 * same input always produces the same order:
 *
 *   1. tier ascending (1 = strongest match, see match.ts)
 *   2. a fixed, documented content-type priority -- purely a stable
 *      tie-break between otherwise-equal matches, NOT an editorial
 *      judgment that e.g. Divya Desams matter more than Knowledge
 *      records
 *   3. each document's own `sourceOrder` (already present on the
 *      underlying record: a Chapter's `order`, or a Divya Desam's
 *      source-page number -- never invented here)
 *   4. alphabetical by title, as a final deterministic fallback so two
 *      results are never left in an arbitrary relative order
 */

const TYPE_PRIORITY: Record<SearchDocument["type"], number> = {
  "divya-desam": 0,
  book: 1,
  chapter: 2,
  knowledge: 3,
};

export function rankSearchResults(matches: SearchMatch[]): SearchMatch[] {
  return [...matches].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;

    const typeDiff = TYPE_PRIORITY[a.document.type] - TYPE_PRIORITY[b.document.type];
    if (typeDiff !== 0) return typeDiff;

    if (a.document.sourceOrder !== b.document.sourceOrder) {
      return a.document.sourceOrder - b.document.sourceOrder;
    }

    return a.document.title.localeCompare(b.document.title);
  });
}
