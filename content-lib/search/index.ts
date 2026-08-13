import { buildSearchCorpus } from "./corpus.ts";
import { searchCorpus } from "./run.ts";
import type { SearchResult } from "./types.ts";

/**
 * Top-level search entry point -- the only function application code
 * needs to call. Orchestrates the pure pieces (searchContent,
 * rankSearchResults, createExcerpt) around the one I/O boundary
 * (buildSearchCorpus, which itself only calls the existing content
 * loader). Rebuilds the corpus fresh on every call -- no caching, no
 * module-level mutable state.
 *
 * An empty/whitespace-only query returns [] rather than "matching
 * everything" -- the caller (app/search/page.tsx) is responsible for
 * distinguishing "no query supplied" from "query supplied, zero
 * results" for the UI's initial-state vs. no-results-state.
 */
export function search(rawQuery: string): SearchResult[] {
  return searchCorpus(buildSearchCorpus(), rawQuery);
}

export { searchCorpus } from "./run.ts";

export { buildSearchCorpus } from "./corpus.ts";
export { normalizeQuery, searchContent } from "./match.ts";
export { rankSearchResults } from "./rank.ts";
export { createExcerpt } from "./excerpt.ts";
export type { SearchMatch } from "./match.ts";
export type { SearchDocument, SearchField, SearchResult, SearchResultType } from "./types.ts";
