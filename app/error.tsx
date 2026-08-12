"use client";

/**
 * Basic route-segment error boundary -- Phase 5J core shell.
 *
 * Covers unexpected failures (e.g. a genuine content/schema problem
 * surfaced by the loader) with a coherent, non-technical message instead
 * of a raw stack trace. Deliberately minimal: no error reporting service
 * is wired up here (that would be a new dependency, out of scope).
 *
 * Phase 5N SEO note (documented limitation, not an oversight): Next.js
 * error boundaries MUST be Client Components ("use client" above is
 * required by the framework), and Client Components cannot export
 * `metadata` -- only Server Components can. There is no supported
 * Next.js mechanism to attach a noindex tag here without either
 * violating that framework constraint or restructuring the error
 * boundary itself, which would be an architectural change outside this
 * phase's scope. In practice this is a low-risk gap: error pages are
 * transient (a real failure, not stable content), unlikely to be
 * crawled and indexed before the underlying issue is fixed.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4 py-12 text-center">
      <p className="eyebrow">Error</p>
      <h1 className="page-title">Something went wrong</h1>
      <p className="prose-body mx-auto max-w-md text-[var(--muted)]">
        An unexpected error occurred while loading this page.
      </p>
      <button type="button" onClick={() => reset()} className="underline">
        Try again
      </button>
    </div>
  );
}
