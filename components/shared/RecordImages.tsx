import type { ImageEntry } from "@/content-lib/schemas";

/**
 * Renders images[] via the Phase 5K image route (app/images/[uuid]/route.ts),
 * which streams the existing asset bytes directly from images/ by
 * sourceAssetUuid -- nothing is copied, renamed, or re-encoded. Originally
 * Phase 5K's DivyaDesamImages; relocated to components/shared/ and renamed
 * in Phase 5L since it is not Divya-Desam-specific -- Chapters and
 * Knowledge records use the exact same ImageEntry shape. Behavior
 * unchanged.
 *
 * Every migrated image currently has alt: null and altStatus:
 * "needs-review" (no human has confirmed real alt text yet). That is NOT
 * the same as "decorative" -- but since no meaningful alt text exists to
 * render, the only accessibility-safe, non-fabricating choice available
 * today is an empty alt (a technically correct, purely-decorative
 * treatment). The underlying altStatus is preserved as a data attribute
 * rather than discarded, so a later editorial-review phase (5N) can still
 * find these images. This is a presentation compromise, not an editorial
 * judgment that the images are actually decorative.
 */
export function RecordImages({ images }: { images: ImageEntry[] }) {
  if (images.length === 0) return null;

  return (
    <section aria-labelledby="images-heading" className="space-y-3">
      <h2 id="images-heading" className="section-heading">
        Images
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image) => (
          <img
            key={image.assetId}
            src={`/images/${image.sourceAssetUuid}`}
            alt={image.alt ?? ""}
            data-alt-status={image.altStatus}
            loading="lazy"
            className="aspect-square w-full rounded-md border border-[var(--border)] object-cover"
          />
        ))}
      </div>
    </section>
  );
}
