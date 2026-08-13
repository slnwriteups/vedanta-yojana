import Link from "next/link";

/**
 * Site footer -- Phase 5J core shell. Intentionally simple: no invented
 * copyright holder, publication owner, social links, or contact
 * information -- none of that has been established for this project yet.
 */

const FOOTER_LINKS = [
  { href: "/divya-desams", label: "Divya Desams" },
  { href: "/library", label: "Library" },
  { href: "/about", label: "About" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="site-container flex flex-col gap-4 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>Vedanta Yojana</p>
        <nav aria-label="Footer">
          <ul role="list" className="flex flex-wrap gap-x-4 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
