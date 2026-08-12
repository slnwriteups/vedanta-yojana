/**
 * Restrained draft/review indicator -- originally Phase 5K (Divya Desam),
 * relocated to components/shared/ in Phase 5L for reuse across Book,
 * Chapter, and Knowledge presentation, none of which are Divya-Desam-
 * specific. Unchanged behavior.
 *
 * Every migrated record currently has status "draft"; this makes that
 * state visible rather than letting the page look editorially finalized.
 * Internal migration metadata (sourcePageId, extractionConfidence) is
 * deliberately never surfaced here -- only the two public-facing signals
 * (status, needsReview) that every content type already exposes.
 */
export function DraftBadge({
  status,
  needsReview,
}: {
  status: string;
  needsReview: boolean;
}) {
  if (status !== "draft") return null;

  return (
    <p className="eyebrow">
      Draft — under review
      {needsReview ? " · flagged for additional review" : ""}
    </p>
  );
}
