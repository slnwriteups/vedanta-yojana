"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { searchCorpus } from "@/content-lib/search/run.ts";
import type { SearchDocument } from "@/content-lib/search/types.ts";
import { SearchForm } from "./SearchForm";
import { SearchResults } from "./SearchResults";

/**
 * The one client component in the search feature -- introduced by the
 * GitHub Pages migration.
 *
 * Previously app/search/page.tsx read `searchParams` and called search()
 * on the server for each request. A statically exported site has no
 * server, so the same work now happens in the browser: fetch the corpus
 * that scripts/build-search-index.ts emitted at build time, then run the
 * identical ranking pipeline over it via searchCorpus(). The ranking,
 * matching and excerpting code is literally the same module the server
 * path used -- only where the corpus comes from changed.
 *
 * Imports searchCorpus from run.ts rather than the content-lib/search
 * barrel on purpose: the barrel re-exports buildSearchCorpus, which pulls
 * the node:fs-backed content loader into the bundle and would break the
 * client build.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function searchHref(query: string): string {
  return query ? `${BASE_PATH}/search/?q=${encodeURIComponent(query)}` : `${BASE_PATH}/search/`;
}

function SearchExperience() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQuery);
  const [corpus, setCorpus] = useState<SearchDocument[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  // Keeps in-component state honest when the URL changes underneath it --
  // browser back/forward, or a no-JS form submission that landed here.
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${BASE_PATH}/search-index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`search index: HTTP ${response.status}`);
        return response.json();
      })
      .then((data: SearchDocument[]) => {
        if (!cancelled) setCorpus(data);
      })
      .catch(() => {
        // Surfaced as an explicit message rather than an endless
        // "Searching…" that never resolves.
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedQuery = query.trim();

  const results = useMemo(
    () => (corpus && trimmedQuery ? searchCorpus(corpus, trimmedQuery) : []),
    [corpus, trimmedQuery]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const submitted = new FormData(event.currentTarget).get("q");
    event.preventDefault();

    const value = typeof submitted === "string" ? submitted : "";
    setQuery(value);

    // replaceState rather than the app router: on a static export the
    // router would try to fetch a server payload for the target URL that
    // no static host can produce. The URL still stays shareable and the
    // query still survives a reload.
    window.history.replaceState(null, "", searchHref(value.trim()));
  }

  return (
    <>
      <SearchForm query={query} onSubmit={handleSubmit} />
      {unavailable ? (
        <p className="prose-body text-[var(--muted)]">
          Search is temporarily unavailable. Please reload the page to try again.
        </p>
      ) : !corpus && trimmedQuery ? (
        <p className="prose-body text-[var(--muted)]">Searching…</p>
      ) : (
        <SearchResults query={trimmedQuery} results={results} />
      )}
    </>
  );
}

export function SearchClient() {
  // useSearchParams needs a Suspense boundary: during the static
  // pre-render there are no query parameters, and the real ones only
  // arrive on the client.
  return (
    <Suspense fallback={<SearchForm query="" />}>
      <SearchExperience />
    </Suspense>
  );
}
