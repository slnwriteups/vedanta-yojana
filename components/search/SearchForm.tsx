/**
 * A plain GET form -- works without any client-side JavaScript. The
 * browser's native form submission navigates to `/search?q=...`, which
 * is exactly what the server-rendered search page reads. No "use
 * client" anywhere in this feature.
 */
export function SearchForm({ query }: { query: string }) {
  return (
    <form action="/search" method="GET" role="search" className="flex flex-wrap gap-3">
      <label htmlFor="search-query" className="sr-only">
        Search
      </label>
      <input
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
