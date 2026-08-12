import type { MetadataRoute } from "next";
import { getSiteOrigin } from "./site.ts";

/**
 * Phase 5N -- allow all crawling by default. The application's universal
 * status="draft" is an editorial workflow state, not an indexing
 * decision this project has actually made -- it must not be read as "the
 * whole site should be noindex'd" (see app/layout.tsx's own robots
 * default and its doc comment). Per-page exceptions (the 404 boundary,
 * parameterized /search?q=... URLs) are handled by their own page-level
 * metadata, not here.
 *
 * The `sitemap` field is included only when a real deployment origin is
 * configured (see lib/site.ts) -- a relative Sitemap: entry in robots.txt
 * would be non-standard and potentially confusing to crawlers, so it is
 * omitted rather than fabricated.
 *
 * Uses a RELATIVE import (not the "@/" alias) so this module can be
 * imported directly by `node --test`; app/robots.ts is a thin wrapper.
 */
export function buildRobots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    ...(origin ? { sitemap: new URL("/sitemap.xml", origin).toString() } : {}),
  };
}
