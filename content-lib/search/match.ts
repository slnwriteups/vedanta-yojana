import type { SearchDocument, SearchField } from "./types.ts";

/**
 * Deterministic, explainable local text matching. No fuzzy matching, no
 * typo-tolerance, and no `RegExp` is ever compiled from the user's query
 * text -- every check is a plain, case-insensitive `String.includes()`,
 * so arbitrary punctuation or regex-special characters in the query can
 * never throw or behave unexpectedly.
 *
 * QUALIFICATION -- does a document match at all: the query is split on
 * whitespace into terms, and every term must appear as a
 * case-insensitive substring SOMEWHERE across the document's fields
 * (different terms may match different fields). This is the "require
 * all query terms to appear somewhere in the record" rule for
 * multi-word queries.
 *
 * TIER -- which of 5 priority buckets a qualifying document lands in,
 * evaluated against the FULL normalized query as one string (not
 * per-term), reproducing the brief's priority ladder exactly:
 *   1 - the title field equals the query exactly
 *   2 - the title starts with the query
 *   3 - the title contains the query
 *   4 - a "strong" field contains the query
 *   5 - catch-all: the document still qualified (every term found
 *       somewhere), but the full query string wasn't found contiguously
 *       in the title or a strong field -- e.g. terms are scattered
 *       across different fields, or only found within a "body" field.
 */

const MAX_QUERY_LENGTH = 200;

export function normalizeQuery(rawQuery: string): string {
  return rawQuery.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
}

function tokenize(normalizedQuery: string): string[] {
  return normalizedQuery.length > 0 ? normalizedQuery.split(" ") : [];
}

export interface SearchMatch {
  document: SearchDocument;
  tier: 1 | 2 | 3 | 4 | 5;
  /** The field an excerpt should be drawn from. Absent for tiers 1-3 (a title match needs no excerpt). */
  matchedField?: SearchField;
}

export function searchContent(corpus: SearchDocument[], rawQuery: string): SearchMatch[] {
  const query = normalizeQuery(rawQuery);
  if (query.length === 0) return [];

  // Case-insensitive means BOTH sides of every comparison are lowercased
  // -- the query as much as the field text.
  const queryLower = query.toLowerCase();
  const terms = tokenize(queryLower);
  const matches: SearchMatch[] = [];

  for (const document of corpus) {
    const lowerFields = document.fields.map((f) => ({ field: f, lower: f.text.toLowerCase() }));

    const everyTermFound = terms.every((term) => lowerFields.some(({ lower }) => lower.includes(term)));
    if (!everyTermFound) continue;

    const titleField = document.fields.find((f) => f.tier === "title");
    const titleLower = titleField?.text.toLowerCase() ?? "";

    if (titleField && titleLower === queryLower) {
      matches.push({ document, tier: 1 });
      continue;
    }
    if (titleField && titleLower.startsWith(queryLower)) {
      matches.push({ document, tier: 2 });
      continue;
    }
    if (titleField && titleLower.includes(queryLower)) {
      matches.push({ document, tier: 3 });
      continue;
    }

    const strongMatch = lowerFields.find(({ field, lower }) => field.tier === "strong" && lower.includes(queryLower));
    if (strongMatch) {
      matches.push({ document, tier: 4, matchedField: strongMatch.field });
      continue;
    }

    // Tier 5: qualified via per-term matching, but the contiguous query
    // string wasn't found in the title or a strong field. Prefer a body
    // field containing the full query verbatim for the excerpt; failing
    // that, whichever field matched the first term at all.
    const bodyFullMatch = lowerFields.find(({ field, lower }) => field.tier === "body" && lower.includes(queryLower));
    const anyFieldForFirstTerm = lowerFields.find(({ lower }) => lower.includes(terms[0]));
    matches.push({
      document,
      tier: 5,
      matchedField: (bodyFullMatch ?? anyFieldForFirstTerm)?.field,
    });
  }

  return matches;
}
