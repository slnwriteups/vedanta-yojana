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
