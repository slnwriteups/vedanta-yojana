/**
 * Safely serializes a JSON-LD object for embedding in a
 * <script type="application/ld+json"> tag. `JSON.stringify` only --
 * never manual string concatenation of any value, so nothing here can
 * produce malformed JSON. Every "<" character is escaped to its unicode
 * form so a literal "</script>" sequence inside any field value can
 * never prematurely close the tag (a well-known JSON-LD embedding
 * hazard, and the same reason Next.js's own documented JSON-LD example
 * does this).
 *
 * Kept in a plain .ts file (not the .tsx component that uses it) so it
 * can be unit-tested directly under Node's native TypeScript execution,
 * which does not transform JSX syntax -- see tests/content/seo.test.ts.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
