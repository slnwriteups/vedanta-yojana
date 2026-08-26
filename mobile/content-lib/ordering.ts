/**
 * Phase 6B -- source-page ordering, mirroring the exact regex and
 * behavior of app/divya-desams/page.tsx (the web reference app) so the
 * mobile Divya Desam index presents temples in the same traditional
 * pilgrimage sequence, not alphabetically or by insertion order. Not
 * reused directly from the web app because it lives in a Next.js page
 * component (app/), which is web-only and out of Metro's watchFolders --
 * this is a straight, disclosed duplication of a five-line pure function,
 * not a schema or loader change.
 */
export function sourcePageNumber(sourcePageId: string): number {
  const match = sourcePageId.match(/^page\.Page(\d+)$/);
  if (!match) {
    throw new Error(
      `Cannot derive a source-ordered position: sourcePageId "${sourcePageId}" does not match the expected "page.PageN" shape.`
    );
  }
  return parseInt(match[1], 10);
}

/**
 * Traditional 1-108 Divya Desam numbering, derived positionally from a
 * slug list already sorted by sourcePageNumber() -- not a schema field
 * (see the "no explicit editorial order field" note on the web index
 * page this mirrors).
 *
 * The corpus has exactly one exception: "Tiruttetriambalam
 * Tirumanikoodam" is a single content record combining what the source
 * book numbers as two separate Divya Desams (#36 and #37 -- confirmed
 * against its own "108-36"/"108-37" image assets), so that one record
 * displays as "36-37" and the running count advances by two only there.
 * Every other record advances by one.
 */
const MERGED_DIVYA_DESAM_SLUG = "tiruttetriambalam-tirumanikoodam";

export function divyaDesamNumberLabels(sortedSlugs: string[]): Map<string, string> {
  const labels = new Map<string, string>();
  let next = 1;
  for (const slug of sortedSlugs) {
    if (slug === MERGED_DIVYA_DESAM_SLUG) {
      labels.set(slug, `${next}-${next + 1}`);
      next += 2;
    } else {
      labels.set(slug, String(next));
      next += 1;
    }
  }
  return labels;
}
