import type { ResourceEntry } from "@/content-lib/schemas";

/**
 * Renders resources[] (currently always Pasuram PDFs) as a plain link
 * list, grouped by nothing beyond the order already present in the
 * record. Uses the existing `language` value verbatim -- never inferred
 * from the URL. If a record has no resources, this renders nothing (no
 * empty heading).
 *
 * Phase 5N: each link carries a visually-hidden "(opens in a new tab)"
 * suffix in addition to the already-visible "(PDF)" label -- both the
 * file type and the new-tab behavior should be discoverable to
 * screen-reader users.
 */
export function ResourceLinks({ resources }: { resources: ResourceEntry[] }) {
  if (resources.length === 0) return null;

  return (
    <section aria-labelledby="resource-links-heading" className="space-y-3">
      <h2 id="resource-links-heading" className="section-heading">
        Pasuram Resources
      </h2>
      <ul role="list" className="flex flex-wrap gap-3 text-sm">
        {resources.map((resource, index) => (
          <li key={`${resource.url}-${index}`}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md border border-[var(--border)] px-3 py-2 hover:border-[var(--accent)] hover:underline"
            >
              {resource.language} Pasuram (PDF)
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
