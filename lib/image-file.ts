import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * UUID-to-image-file resolution.
 *
 * Originally (Phase 5K) this backed a runtime route handler at
 * app/images/[uuid]/route.ts, which streamed bytes out of a top-level
 * images/ directory that sat outside /public. The GitHub Pages migration
 * removed that route: Pages serves static files with no Node.js runtime,
 * so there is nothing to execute a handler. images/ moved to
 * public/images/ and is now served directly by URL.
 *
 * What remains here is the mapping problem that move did NOT solve:
 * content records store a bare `sourceAssetUuid` with no file extension,
 * while the files on disk are a mix of .jpg/.jpeg/.png/.webp. Something
 * still has to turn one into the other. That now happens at BUILD time
 * (see `resolveImageHref`, called from components/shared/RecordImages.tsx
 * while pre-rendering) rather than per request.
 */

const IMAGES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/images"
);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * Lowercased-UUID -> on-disk filename, built once on first use.
 *
 * The pre-render pass resolves every image on every record, so the old
 * per-call `readdirSync` would have re-scanned a 217-entry directory
 * hundreds of times during a single build. Caching is safe here in a way
 * it would not have been for the old request-time route: a static export
 * reads the directory during one short-lived build process, and the
 * directory cannot change underneath it.
 */
let indexCache: Map<string, string> | null = null;

function imageIndex(): Map<string, string> {
  if (indexCache) return indexCache;

  const index = new Map<string, string>();
  const entries = fs.existsSync(IMAGES_DIR) ? fs.readdirSync(IMAGES_DIR) : [];
  for (const entry of entries) {
    index.set(path.parse(entry).name.toLowerCase(), entry);
  }

  indexCache = index;
  return index;
}

function lookupFilename(uuid: string): string | null {
  if (!UUID_PATTERN.test(uuid)) return null;
  return imageIndex().get(uuid.toLowerCase()) ?? null;
}

export interface ResolvedImageFile {
  data: Buffer;
  contentType: string;
}

/**
 * Resolves a `sourceAssetUuid` to its file under public/images/ and reads
 * the bytes. Returns null (never throws) for an invalid UUID shape or an
 * unknown UUID. Retained as the byte-level primitive and as the thing
 * tests/app/images-route.test.ts asserts against.
 */
export function resolveImageFile(uuid: string): ResolvedImageFile | null {
  const match = lookupFilename(uuid);
  if (!match) return null;

  const extension = path.extname(match).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
  const data = fs.readFileSync(path.join(IMAGES_DIR, match));

  return { data, contentType };
}

/**
 * Resolves a `sourceAssetUuid` to the public URL its file is served at,
 * e.g. "/vedanta-yojana/images/00bc3e9a-....jpg". Returns null for an
 * unknown or malformed UUID so the caller can omit the image rather than
 * emit a src that is guaranteed to 404.
 *
 * The basePath prefix is applied by hand because Next.js only rewrites
 * URLs it controls (next/link, next/image) -- a raw <img src> is passed
 * through untouched, and would 404 on a project-page deployment served
 * from a sub-path.
 */
export function resolveImageHref(uuid: string): string | null {
  const match = lookupFilename(uuid);
  if (!match) return null;

  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/images/${match}`;
}
