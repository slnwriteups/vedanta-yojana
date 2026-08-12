import { NextResponse } from "next/server";
import { resolveImageFile } from "@/lib/image-file";

/**
 * Phase 5K -- minimal, disclosed architectural addition (see lib/image-file.ts
 * for the full rationale: images/ sits outside /public, which Next.js
 * only auto-serves from, and this is the standard dependency-free Next.js
 * mechanism for serving files that live elsewhere).
 *
 * Phase 5O: the actual UUID-to-file resolution logic was extracted into
 * lib/image-file.ts's `resolveImageFile` purely so it could be unit-
 * tested directly (see tests/app/images-route.test.ts) -- `next/server`
 * is not resolvable by Node's plain module loader outside Next's own
 * bundler, so this route handler itself cannot be `import`-ed by a
 * plain `node --test` file. This file is now a thin wrapper with
 * IDENTICAL behavior to the original inline implementation: same UUID
 * validation, same file resolution, same status codes, same headers.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params;

  const resolved = resolveImageFile(uuid);
  if (!resolved) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(resolved.data), {
    status: 200,
    headers: {
      "Content-Type": resolved.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
