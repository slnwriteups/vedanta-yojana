import Link from "next/link";
import type { DivyaDesam } from "@/content-lib/schemas";
import { DraftBadge } from "@/components/shared/DraftBadge";

/**
 * One row of the Divya Desam index. Deliberately plain (a divider list,
 * not a bordered/shadowed "card") per the Phase 5J/5K restrained visual
 * language. The secondary line uses only an already-present field
 * (templeInformation.moolavar, the presiding deity) and is omitted
 * entirely when that field is absent -- never a fabricated summary.
 */
export function DivyaDesamCard({ record }: { record: DivyaDesam }) {
  return (
    <li className="py-4">
      <Link href={`/divya-desams/${record.slug}`} className="block hover:underline">
        <span className="font-medium">{record.displayName}</span>
      </Link>
      {record.templeInformation.moolavar ? (
        <p className="mt-1 text-sm text-[var(--muted)]">
          {record.templeInformation.moolavar}
        </p>
      ) : null}
      <div className="mt-1">
        <DraftBadge status={record.status} needsReview={record.migration.needsReview} />
      </div>
    </li>
  );
}
