import { SlugCollisionError } from "./errors.ts";

const COMBINING_DIACRITICAL_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Deterministic slug generation from a source title.
 *
 * Mechanical steps, in order (no generative/heuristic inference):
 *   1. Strip a leading numeric-ordinal prefix, e.g. "108) " or "12. "
 *      (a one-off artifact observed in the real source, per Phase 5A).
 *   2. Unicode-normalize to NFD and strip combining diacritical marks
 *      (conservative diacritic handling — "Śrī" -> "sri"), so that
 *      accented source titles still produce a plain-ASCII slug. This
 *      never touches `displayName`, which always preserves the source
 *      title exactly as-is — only the derived slug is normalized.
 *   3. Lowercase.
 *   4. Replace every run of one-or-more non-alphanumeric characters
 *      (spaces, punctuation, parentheses, repeated punctuation, etc.)
 *      with a single hyphen.
 *   5. Trim any leading/trailing hyphen.
 */
export function generateSlugFromTitle(title: string): string {
  let s = title;
  s = s.replace(/^\s*\(?\d+\)?[.)]\s*/, "");
  s = s.normalize("NFD").replace(COMBINING_DIACRITICAL_MARKS, "");
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s;
}

export interface SlugbearingSource {
  sourcePageId: string;
  slug: string;
}

/**
 * Checks a batch of already-generated (sourcePageId, slug) pairs for
 * collisions and throws SlugCollisionError identifying every colliding
 * source record. Does NOT silently disambiguate by appending a suffix —
 * a collision is a genuine authoring conflict that needs a human
 * decision (e.g. renaming one of the source titles), not an invented
 * resolution.
 */
export function assertNoSlugCollisions(records: SlugbearingSource[]): void {
  const bySlug = new Map<string, string[]>();
  for (const record of records) {
    const list = bySlug.get(record.slug) ?? [];
    list.push(record.sourcePageId);
    bySlug.set(record.slug, list);
  }
  for (const [slug, sourcePageIds] of bySlug) {
    if (sourcePageIds.length > 1) {
      throw new SlugCollisionError(slug, sourcePageIds);
    }
  }
}
