import type { ImageEntry } from "@/content-lib/schemas";
import { resolveImageHref } from "@/lib/image-file";

/**
 * Renders images[] as static files under public/images/, resolved from
 * sourceAssetUuid to a real filename at build time by resolveImageHref
 * (see lib/image-file.ts) -- nothing is copied, renamed, or re-encoded.
 * This replaced the Phase 5K runtime route (app/images/[uuid]/route.ts)
 * during the GitHub Pages migration, which removed the Node.js runtime a
 * route handler needs. Originally
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
/**
 * `idSuffix` disambiguates the section id when a page renders this
 * component more than once (Phase 6E-C follow-up: a record's images may
 * now split into a top group and an after-Sthala-Puranam group) -- two
 * elements sharing one id is invalid HTML and breaks aria-labelledby.
 */
export function RecordImages({ images, idSuffix = "" }: { images: ImageEntry[]; idSuffix?: string }) {
  // An image whose UUID has no matching file is dropped rather than
  // rendered with a src that is certain to 404. Resolution happens here,
  // during the static pre-render, so a missing asset is visible at build
  // time instead of as a broken image in someone's browser.
  const resolved = images.flatMap((image) => {
    const href = resolveImageHref(image.sourceAssetUuid);
    return href ? [{ image, href }] : [];
  });

  if (resolved.length === 0) return null;

  const headingId = `images-heading${idSuffix}`;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="section-heading">
        Images
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {resolved.map(({ image, href }) => (
          <img
            key={image.assetId}
            src={href}
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
