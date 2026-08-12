/**
 * Search types -- Phase 5M.
 *
 * Deliberately separate from content-lib/schemas/** (which stays
 * untouched/protected): these types describe the SEARCH feature's own
 * internal corpus/result shapes, not the content model itself.
 */

export type SearchResultType = "divya-desam" | "book" | "chapter" | "knowledge";

/**
 * A single searchable text field on a document, tagged with a weight
 * tier used by content-lib/search/match.ts to rank matches:
 *   "title"  -- the record's own display title.
 *   "strong" -- short, structured metadata (temple-information fields,
 *               a meaningful shrine label, a chapter's parent book
 *               title, a Knowledge record's contentType, a Book's
 *               author/description).
 *   "body"   -- long-form prose (sthalaPuranam, azhwarPasuram, a
 *               chapter's body, a Knowledge record's body).
 * `name` is an internal identifier only (e.g. "moolavar") -- never
 * rendered to the user.
 */
export interface SearchField {
  name: string;
  tier: "title" | "strong" | "body";
  text: string;
}

/**
 * One searchable unit built from a real content record. Never
 * constructed from anything other than the existing content loader's
 * output (see content-lib/search/corpus.ts).
 */
export interface SearchDocument {
  type: SearchResultType;
  title: string;
  href: string;
  parentTitle?: string;
  status: string;
  needsReview: boolean;
  /**
   * A deterministic tie-break value already present on the underlying
   * record (a Chapter's own `order`, or a Divya Desam's source-page
   * number derived the same way as the Phase 5K index page) -- never an
   * invented editorial ranking. 0 for types with no natural ordering
   * (Book, Knowledge -- there is exactly one of each today).
   */
  sourceOrder: number;
  fields: SearchField[];
}

/**
 * What the UI actually renders. No internal migration metadata
 * (sourcePageId, extractionConfidence, classification, filesystem
 * paths, UUIDs) is present on this type at all -- not merely omitted by
 * convention.
 */
export interface SearchResult {
  type: SearchResultType;
  title: string;
  href: string;
  parentTitle?: string;
  status: string;
  needsReview: boolean;
  excerpt?: string;
}
