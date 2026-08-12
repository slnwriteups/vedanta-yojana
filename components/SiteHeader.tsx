"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Site header -- Phase 5J core shell.
 *
 * A client component (not the Phase 5B server-rendered stub) so the
 * current route can be indicated (`usePathname`) and a mobile menu can be
 * toggled. Basic navigation itself needs no JavaScript: every link below
 * is a real `next/link` anchor and works identically with JS disabled --
 * only the active-route highlight and the mobile disclosure are
 * client-side enhancements, isolated to this one component.
 */

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/divya-desams", label: "Divya Desams" },
  { href: "/library", label: "Library" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "About" },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="site-container flex items-center justify-between gap-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Vedanta Yojana
        </Link>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-[var(--border)] px-3 py-2 text-sm sm:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
        </button>

        <nav aria-label="Primary" className="hidden sm:block">
          <ul role="list" className="flex flex-wrap gap-6 text-sm">
            {NAV_LINKS.map((link) => {
              const active = isActiveRoute(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "font-semibold text-[var(--accent)] hover:underline"
                        : "hover:underline"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <nav
        id="mobile-navigation"
        aria-label="Primary"
        className={`site-container border-t border-[var(--border)] pt-4 pb-4 sm:hidden ${menuOpen ? "block" : "hidden"}`}
      >
        <ul role="list" className="flex flex-col gap-1 text-sm">
          {NAV_LINKS.map((link) => {
            const active = isActiveRoute(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={
                    active
                      ? "block rounded-md px-2 py-2 font-semibold text-[var(--accent)]"
                      : "block rounded-md px-2 py-2 hover:underline"
                  }
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
