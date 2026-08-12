import Link from "next/link";
import type { Knowledge } from "@/content-lib/schemas";
import { DraftBadge } from "@/components/shared/DraftBadge";

/**
 * One row of the Knowledge index. `contentType` (e.g. "educational") is
 * required by the schema and rendered verbatim -- never transformed
 * (capitalized, expanded, etc.) or fabricated when the schema didn't
 * already guarantee it.
 */
export function KnowledgeCard({ record }: { record: Knowledge }) {
  return (
    <li className="py-4">
      <Link href={`/knowledge/${record.slug}`} className="block hover:underline">
        <span className="font-medium">{record.title}</span>
      </Link>
      <p className="mt-1 text-sm text-[var(--muted)]">{record.contentType}</p>
      <div className="mt-1">
        <DraftBadge status={record.status} needsReview={record.migration.needsReview} />
      </div>
    </li>
  );
}
