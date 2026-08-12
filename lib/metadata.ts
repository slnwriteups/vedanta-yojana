const DEFAULT_MAX_LENGTH = 155;

/**
 * A plain length-based truncation of REAL stored content for use as a
 * meta description -- not a rewrite, not a summary, not fabricated
 * boilerplate. Collapses whitespace, cuts at a word boundary where
 * possible, and appends an ellipsis only when the text was actually
 * truncated. The same kind of "real text, mechanically shortened"
 * treatment already established for search excerpts
 * (content-lib/search/excerpt.ts), applied here to metadata instead.
 */
export function truncateForDescription(text: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;

  const cut = collapsed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const safeCut = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${safeCut}…`;
}
