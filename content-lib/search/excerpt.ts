/**
 * Builds a short excerpt directly from stored text -- never rewrites,
 * summarizes, or fabricates surrounding prose, and never alters the
 * matched text itself. If the (normalized) query is found verbatim in
 * the text, the excerpt window is centered on that occurrence;
 * otherwise the query's first term is tried; if neither is found, the
 * excerpt falls back to the start of the text (still real, unmodified
 * stored content -- just not centered on anything in particular).
 */

const EXCERPT_LENGTH = 160;
const HALF_WINDOW = Math.floor(EXCERPT_LENGTH / 2);

export function createExcerpt(text: string, normalizedQuery: string): string {
  const lowerText = text.toLowerCase();
  const candidates = [normalizedQuery, normalizedQuery.split(" ")[0] ?? ""].filter(
    (candidate) => candidate.length > 0
  );

  let matchIndex = -1;
  let matchLength = 0;
  for (const candidate of candidates) {
    const index = lowerText.indexOf(candidate.toLowerCase());
    if (index !== -1) {
      matchIndex = index;
      matchLength = candidate.length;
      break;
    }
  }

  let start: number;
  let end: number;

  if (matchIndex === -1) {
    start = 0;
    end = Math.min(text.length, EXCERPT_LENGTH);
  } else {
    const center = matchIndex + Math.floor(matchLength / 2);
    end = Math.min(text.length, Math.max(0, center - HALF_WINDOW) + EXCERPT_LENGTH);
    start = Math.max(0, end - EXCERPT_LENGTH);
  }

  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end).trim() + suffix;
}
