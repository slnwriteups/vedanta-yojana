import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Pure, framework-independent resolution logic for the image-serving
 * route (app/images/[uuid]/route.ts) -- extracted in Phase 5O purely so
 * it can be unit-tested directly by `node --test` (see
 * tests/app/images-route.test.ts). `next/server`'s `NextResponse` (used
 * by the route handler to wrap this function's result) is not
 * resolvable by Node's plain ESM loader outside Next.js's own bundler
 * (`import "next/server"` resolves fine under Next's bundler, which
 * appends the `.js` extension the way `next/server.js` does explicitly,
 * but not under plain `node --test`) -- the same category of bundler-
 * vs-plain-Node resolution gap already documented for
 * `import.meta.dirname` in Phase 5J-B, just in the opposite direction
 * (works under the bundler, not under plain Node, rather than the
 * reverse). Keeping this logic dependency-free sidesteps that gap
 * entirely rather than fighting it.
 *
 * Behavior is IDENTICAL to the original inline Phase 5K implementation --
 * this is a pure code-organization change, not a behavior change.
 */

const IMAGES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../images");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export interface ResolvedImageFile {
  data: Buffer;
  contentType: string;
}

/**
 * Resolves a `sourceAssetUuid` to its existing binary file under
 * `images/` and reads its bytes. Returns null (never throws) for an
 * invalid UUID shape or an unknown UUID -- the caller (the route
 * handler) turns that into a 404.
 */
export function resolveImageFile(uuid: string): ResolvedImageFile | null {
  if (!UUID_PATTERN.test(uuid)) return null;

  const entries = fs.existsSync(IMAGES_DIR) ? fs.readdirSync(IMAGES_DIR) : [];
  const match = entries.find((entry) => path.parse(entry).name.toLowerCase() === uuid.toLowerCase());
  if (!match) return null;

  const extension = path.extname(match).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
  const data = fs.readFileSync(path.join(IMAGES_DIR, match));

  return { data, contentType };
}
