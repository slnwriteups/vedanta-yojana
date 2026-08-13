import { normalizeQuery, searchContent } from "./match.ts";
import { rankSearchResults } from "./rank.ts";
import { createExcerpt } from "./excerpt.ts";
import type { SearchDocument, SearchResult } from "./types.ts";

/**
 * The corpus-agnostic half of search: given an already-built corpus,
 * produce ranked results.
 *
 * Split out of index.ts's `search()` during the GitHub Pages migration.
 * `search()` still exists and behaves identically -- it now just supplies
 * the corpus from disk and delegates here. The reason for the split is
 * that everything in this file is pure and browser-safe, whereas
 * buildSearchCorpus (and the content loader beneath it) needs node:fs.
 * A statically exported site has no server, so search runs in the
 * browser against a prebuilt JSON corpus, and needs exactly this half
 * and nothing more -- importing index.ts instead would drag node:fs into
 * the client bundle.
 */
export function searchCorpus(corpus: SearchDocument[], rawQuery: string): SearchResult[] {
  const matches = searchContent(corpus, rawQuery);
  const ranked = rankSearchResults(matches);
  const query = normalizeQuery(rawQuery);

  return ranked.map(({ document, tier, matchedField }) => ({
    type: document.type,
    title: document.title,
    href: document.href,
    parentTitle: document.parentTitle,
    status: document.status,
    needsReview: document.needsReview,
    excerpt: tier <= 3 || !matchedField ? undefined : createExcerpt(matchedField.text, query),
  }));
}
