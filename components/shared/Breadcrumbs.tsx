import Link from "next/link";

/**
 * Generic breadcrumb trail. `trail` entries are linked; `current` is the
 * page's own title, rendered as plain text with aria-current="page" (the
 * current page is never a link to itself).
 *
 * Phase 5N: rendered as a real <ol> of <li> items -- proper "structured
 * navigation" breadcrumb semantics (matching the WAI-ARIA breadcrumb
 * pattern), not a flat run of <span>s as in the original Phase 5L
 * version. `role="list"` is set explicitly because Tailwind's preflight
 * resets `list-style: none` on every <ul>/<ol> sitewide, which is known
 * to strip the implicit list semantics in Safari/VoiceOver -- the same
 * fix applied to every other list in the application this phase.
 */
export function Breadcrumbs({
  trail,
  current,
}: {
  trail: { href: string; label: string }[];
  current: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--muted)]">
      <ol role="list" className="flex flex-wrap items-center gap-1">
        {trail.map((item) => (
          <li key={item.href} className="flex items-center gap-1">
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
            <span aria-hidden="true">/</span>
          </li>
        ))}
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}
