import type { SearchResult as SearchResultData } from "@/content-lib/search";
import { SearchResult } from "./SearchResult";

/**
 * Three distinct, deliberate states -- never "no query = show everything":
 *   - no query supplied (or blank/whitespace-only) -> initial state
 *   - query supplied, zero matches -> explicit no-results state
 *   - query supplied, one or more matches -> the results list
 */
export function SearchResults({
  query,
  results,
}: {
  query: string;
  results: SearchResultData[];
}) {
  if (!query) {
    return (
      <p className="prose-body text-[var(--muted)]">
        Enter a search term above to find Divya Desams, Library chapters, and
        Knowledge records.
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <p className="prose-body text-[var(--muted)]">
        No results found for &ldquo;{query}&rdquo;.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="section-heading">
        {results.length} {results.length === 1 ? "result" : "results"} for
        &ldquo;{query}&rdquo;
      </h2>
      <ul role="list" className="divide-y divide-[var(--border)]">
        {results.map((result) => (
          <SearchResult key={`${result.type}-${result.href}`} result={result} />
        ))}
      </ul>
    </div>
  );
}
