import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/sitemap";

/**
 * Next.js sitemap convention entry point. The actual logic lives in
 * lib/sitemap.ts (using relative imports so it can also be unit-tested
 * directly by `node --test` -- see tests/content/seo.test.ts) since this
 * file's "@/" path alias only resolves under Next.js's own bundler.
 */
/**
 * Required by `output: "export"` -- see app/robots.ts. Safe for the same
 * reason: the entry list is derived from content/ at build time.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries();
}
