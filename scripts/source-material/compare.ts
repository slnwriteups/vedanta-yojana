/**
 * Phase 6E -- deterministic, non-fuzzy-in-spirit text comparison used to
 * classify a book field against the corresponding existing field as
 * "materially equivalent" vs. "genuinely different" (a conflict).
 * Deliberately mechanical (case/whitespace/punctuation-insensitive
 * comparison, and a plain longest-common-substring-ratio for long-form
 * prose) rather than anything that guesses semantic equivalence --
 * per the brief's fidelity rules, when in doubt this must classify as a
 * conflict/ambiguity for human review, never silently decide two
 * differently-worded facts "mean the same thing".
 */

const COMBINING_DIACRITICAL_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function normalizeForCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICAL_MARKS, "") // strip combining diacritics, same conservative handling as scripts/migration/slug.ts
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Exact match after normalization, or one is fully contained in the other (common for short fields with a suffixed honorific/title). */
export function shortFieldsEquivalent(a: string, b: string): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return true;
  if (na.length === 0 || nb.length === 0) return false;
  return na.includes(nb) || nb.includes(na);
}

/**
 * Longest-common-substring-based overlap ratio in [0, 1], for long-form
 * prose (Sthala Puranam / Azhwar Pasuram) where exact/substring matching
 * is too strict (different transcriptions of the same legend will never
 * be byte-identical) but any real semantic-equivalence judgment would be
 * exactly the kind of invented inference the brief prohibits. This is
 * intentionally simple (single LCS pass, not an edit-distance/diff
 * library -- no new dependency) and only used to decide whether two
 * long-form fields are similar enough to skip, or different enough to
 * flag for human review; it never decides what the "correct" merged text
 * is.
 */
export function longestCommonSubstringRatio(a: string, b: string): number {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na.length === 0 || nb.length === 0) return 0;

  let best = 0;
  const prev = new Array(nb.length + 1).fill(0);
  for (let i = 1; i <= na.length; i++) {
    let prevDiag = 0;
    for (let j = 1; j <= nb.length; j++) {
      const temp = prev[j];
      if (na[i - 1] === nb[j - 1]) {
        prev[j] = prevDiag + 1;
        if (prev[j] > best) best = prev[j];
      } else {
        prev[j] = 0;
      }
      prevDiag = temp;
    }
  }
  return best / Math.max(na.length, nb.length);
}

/**
 * Word-set overlap ratio in [0, 1] -- intersection size over the smaller
 * set's size, for words of 4+ characters (drops common short
 * connective words that would otherwise dominate the set and dilute the
 * signal). Used for longer, multi-paragraph prose (whole book chapters)
 * where `longestCommonSubstringRatio` badly UNDERESTIMATES real
 * similarity: a handful of small copyedits scattered through a long
 * chapter (a word changed here, a sentence reworded there) breaks any
 * single contiguous run into short fragments, even when the two texts
 * are otherwise near-identical. Word overlap is insensitive to WHERE
 * the differences fall, only to how much of the vocabulary is shared --
 * appropriate for "is this substantially the same chapter", not
 * appropriate for "are these values byte-identical" (which
 * shortFieldsEquivalent/exact comparison already covers elsewhere).
 */
export function wordOverlapRatio(a: string, b: string): number {
  const wordsA = new Set(normalizeForCompare(a).split(" ").filter((w) => w.length >= 4));
  const wordsB = new Set(normalizeForCompare(b).split(" ").filter((w) => w.length >= 4));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  return intersection / Math.min(wordsA.size, wordsB.size);
}
