import type { Shrine } from "@/content-lib/schemas";

/**
 * Renders shrines[] as plain external links. Labels are already
 * normalized by the migration layer (e.g. "Map 1", "Maps- X") and are
 * rendered verbatim -- no re-normalization happens here. A null label
 * (a single, undistinguished Maps link -- the common single-shrine case,
 * e.g. Sri Rangam) falls back to a generic, non-fabricated label.
 *
 * Phase 5N: each link carries a visually-hidden "(opens in a new tab)"
 * suffix -- every link here is `target="_blank"`, and that behavior
 * should be discoverable to screen-reader users, not only sighted ones
 * inferring it from context.
 */
export function ShrineLinks({ shrines }: { shrines: Shrine[] }) {
  if (shrines.length === 0) return null;

  return (
    <section aria-labelledby="shrine-links-heading" className="space-y-3">
      <h2 id="shrine-links-heading" className="section-heading">
        Shrine Location{shrines.length > 1 ? "s" : ""}
      </h2>
      <ul role="list" className="flex flex-wrap gap-3 text-sm">
        {shrines.map((shrine, index) => (
          <li key={`${shrine.mapsLink}-${index}`}>
            <a
              href={shrine.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md border border-[var(--border)] px-3 py-2 hover:border-[var(--accent)] hover:underline"
            >
              {shrine.label ?? "View on Google Maps"}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
