import type { Metadata } from "next";
import { search } from "@/content-lib/search";
import { SearchForm } from "@/components/search/SearchForm";
import { SearchResults } from "@/components/search/SearchResults";

function readQuery(params: { q?: string | string[] }): string {
  const rawQuery = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  return rawQuery;
}

/**
 * Phase 5N: the canonical for every /search?q=... variant is the bare
 * /search page -- search results are not given their own indexed page
 * per arbitrary query (an infinite, low-value URL space). The bare page
 * (no query) stays indexable; any query variant is explicitly noindex'd
 * (but still `follow`, so a crawler can still reach linked content pages
 * from a result list it happens to fetch).
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasQuery = readQuery(params).trim().length > 0;

  return {
    title: "Search",
    alternates: { canonical: "/search" },
    robots: { index: !hasQuery, follow: true },
  };
}

/**
 * Phase 5M -- real, loader-backed, server-rendered search.
 *
 * A standard URL-driven GET flow: /search?q=... -> read q -> search() ->
 * render. No client component, no client-side search framework, no API
 * route -- the same request that renders the page also computes the
 * results, using the existing content loader via content-lib/search.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuery = readQuery(params);
  const query = rawQuery.trim();
  const results = query ? search(query) : [];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="page-title">Search</h1>
        <p className="prose-body max-w-2xl text-[var(--muted)]">
          Search across Divya Desams, the Library, and Knowledge records.
        </p>
      </div>

      <SearchForm query={rawQuery} />
      <SearchResults query={query} results={results} />
    </div>
  );
}
