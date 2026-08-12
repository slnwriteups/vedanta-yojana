import Link from "next/link";
import type { SearchResult as SearchResultData } from "@/content-lib/search";
import { DraftBadge } from "@/components/shared/DraftBadge";

/** Content-type label shown as visible text -- never color-only. */
const TYPE_LABELS: Record<SearchResultData["type"], string> = {
  "divya-desam": "Divya Desam",
  book: "Book",
  chapter: "Chapter",
  knowledge: "Knowledge",
};

export function SearchResult({ result }: { result: SearchResultData }) {
  return (
    <li className="py-4">
      <p className="eyebrow">
        {TYPE_LABELS[result.type]}
        {result.parentTitle ? ` · ${result.parentTitle}` : ""}
      </p>
      <Link href={result.href} className="font-medium hover:underline">
        {result.title}
      </Link>
      {result.excerpt ? (
        <p className="mt-1 text-sm text-[var(--muted)]">{result.excerpt}</p>
      ) : null}
      <div className="mt-1">
        <DraftBadge status={result.status} needsReview={result.needsReview} />
      </div>
    </li>
  );
}
