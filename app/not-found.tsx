import type { Metadata } from "next";
import Link from "next/link";

/**
 * Global not-found boundary -- Phase 5J core shell.
 *
 * Covers both unknown routes (Next's default 404 behavior) and dynamic
 * content that doesn't resolve (every dynamic route calls `notFound()`
 * from `next/navigation` when the loader returns null, which renders this
 * same boundary since no route-specific `not-found.tsx` overrides it).
 *
 * Phase 5N: explicitly noindex'd -- a 404 page has no content of its
 * own worth appearing in search results, regardless of the layout's
 * sitewide indexable default.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="space-y-4 py-12 text-center">
      <p className="eyebrow">404</p>
      <h1 className="page-title">Page not found</h1>
      <p className="prose-body mx-auto max-w-md text-[var(--muted)]">
        The page you are looking for does not exist, or has not been published
        yet.
      </p>
      <p>
        <Link href="/" className="underline">
          Return home
        </Link>
      </p>
    </div>
  );
}
