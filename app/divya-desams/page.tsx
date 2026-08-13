import type { Metadata } from "next";
import type { DivyaDesam } from "@/content-lib/schemas";
import { loadDivyaDesams } from "@/content-lib/loader";
import { DivyaDesamCard } from "@/components/divya-desams/DivyaDesamCard";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Divya Desams",
  description:
    "The 108 Divya Desams are the sacred abodes of Vishnu venerated by the Alwars.",
  alternates: { canonical: siteUrl("/divya-desams") },
};

/**
 * Phase 5K -- real, loader-driven Divya Desam index.
 *
 * Ordering: the schema has no explicit editorial order field, and
 * inventing one (or sorting alphabetically, which would scramble the
 * traditional pilgrimage sequence for no reason) is out of scope. Per
 * the Phase 5K brief section 6, this uses the existing source-derived
 * `migration.sourcePageId` ("page.PageN") as the sort key -- the same
 * source/migration provenance already used to order the recovered book's
 * chapters during the earlier full-content migration, applied here as a
 * presentation-layer sort (no content or schema change).
 */
function sourcePageNumber(record: DivyaDesam): number {
  const match = record.migration.sourcePageId.match(/^page\.Page(\d+)$/);
  if (!match) {
    throw new Error(
      `Cannot derive a source-ordered position for "${record.slug}": sourcePageId "${record.migration.sourcePageId}" does not match the expected "page.PageN" shape.`
    );
  }
  return parseInt(match[1], 10);
}

export default function DivyaDesamsIndexPage() {
  const records = [...loadDivyaDesams()].sort(
    (a, b) => sourcePageNumber(a) - sourcePageNumber(b)
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="page-title">Divya Desams</h1>
        <p className="prose-body max-w-2xl text-[var(--muted)]">
          The 108 Divya Desams are the sacred abodes of Vishnu venerated by
          the Alwars. {records.length} records are presented below.
        </p>
      </div>

      <ul role="list" className="divide-y divide-[var(--border)]">
        {records.map((record) => (
          <DivyaDesamCard key={record.slug} record={record} />
        ))}
      </ul>
    </div>
  );
}
