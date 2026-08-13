import type { MetadataRoute } from "next";
import { buildRobots } from "@/lib/robots";

/**
 * Next.js robots convention entry point. The actual logic lives in
 * lib/robots.ts (using relative imports so it can also be unit-tested
 * directly by `node --test` -- see tests/content/seo.test.ts) since this
 * file's "@/" path alias only resolves under Next.js's own bundler.
 */
/**
 * Required by `output: "export"`, which refuses to guess whether a
 * metadata route is safe to emit as a file. It is: buildRobots() reads
 * only build-time configuration, so one robots.txt is generated at build
 * and served unchanged.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
