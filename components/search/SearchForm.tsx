import type { FormEvent } from "react";

/**
 * Still a plain GET form: with JavaScript disabled the browser's native
 * submission navigates to /search/?q=..., which is a real pre-rendered
 * page. What changed in the GitHub Pages migration is what happens after
 * that navigation -- results are computed in the browser rather than by
 * the server (see SearchClient.tsx), so a no-JS visitor reaches the
 * search page with their query preserved in this input but sees no
 * result list. That is a genuine, unavoidable reduction: a static host
 * has no server to compute results on.
 *
 * `onSubmit` is optional. Omitted, this is exactly the original
 * uncontrolled GET form. Supplied (as SearchClient does), it intercepts
 * submission to search in place, avoiding a full page reload and a
 * re-fetch of the search index.
 */

const SEARCH_ACTION = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/search/`;

export function SearchForm({
  query,
  onSubmit,
}: {
  query: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      action={SEARCH_ACTION}
      method="GET"
      role="search"
      onSubmit={onSubmit}
      className="flex flex-wrap gap-3"
    >
      <label htmlFor="search-query" className="sr-only">
        Search
      </label>
      <input
        // Re-keyed on query so that a browser back/forward navigation,
        // which changes the URL without remounting this component, still
        // resets the visible input to match the restored query.
        key={query}
        id="search-query"
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Search Divya Desams, the Library, and Knowledge…"
        className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)]"
      >
        Search
      </button>
    </form>
  );
}
