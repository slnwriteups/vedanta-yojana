import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveImageFile } from "../../lib/image-file.ts";
import { loadDivyaDesam } from "../../content-lib/loader/index.ts";

/**
 * Phase 5O -- runtime test for the image-serving route handler's actual
 * resolution logic (lib/image-file.ts's `resolveImageFile`, used by
 * app/images/[uuid]/route.ts). Previously this contract was only ever
 * verified manually via curl during each phase's live-verification step
 * (Phases 5K/5L/5M reports) -- never by an automated test. The route
 * handler itself cannot be imported directly by `node --test` because it
 * imports `next/server`, which is not resolvable by Node's plain module
 * loader outside Next's own bundler (see lib/image-file.ts's doc
 * comment) -- resolveImageFile is the extracted, dependency-free logic
 * that makes the underlying behavior testable without that obstacle.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("resolves the real image bytes for a real Divya Desam image's sourceAssetUuid", () => {
  const record = loadDivyaDesam("sri-rangam");
  assert.ok(record);
  const image = record!.images[0];
  assert.ok(image);

  const resolved = resolveImageFile(image.sourceAssetUuid);
  assert.ok(resolved);

  const onDisk = fs
    .readdirSync(path.join(REPO_ROOT, "images"))
    .find((f) => path.parse(f).name.toLowerCase() === image.sourceAssetUuid.toLowerCase());
  assert.ok(onDisk, "expected a matching file under images/");
  const expected = fs.readFileSync(path.join(REPO_ROOT, "images", onDisk!));

  assert.ok(resolved!.data.equals(expected), "resolved bytes must be byte-identical to the source file");
});

test("returns a Content-Type matching the real file's extension", () => {
  const record = loadDivyaDesam("sri-rangam");
  const image = record!.images[0];
  const resolved = resolveImageFile(image.sourceAssetUuid);
  assert.ok(resolved?.contentType.startsWith("image/"), `expected an image/* content type, got ${resolved?.contentType}`);
});

test("returns null for a well-formed but unknown UUID", () => {
  assert.equal(resolveImageFile("00000000-0000-0000-0000-000000000000"), null);
});

test("returns null (never throws) for a non-UUID-shaped input, including traversal-shaped values", () => {
  for (const malformed of ["not-a-uuid", "../../../package.json", "..", "", "1234"]) {
    assert.doesNotThrow(() => resolveImageFile(malformed));
    assert.equal(resolveImageFile(malformed), null, `expected null for malformed input: ${JSON.stringify(malformed)}`);
  }
});

test("UUID matching is case-insensitive", () => {
  const record = loadDivyaDesam("sri-rangam");
  const image = record!.images[0];
  const resolved = resolveImageFile(image.sourceAssetUuid.toUpperCase());
  assert.ok(resolved);
});

test("resolveImageFile never touches image-map.json or content-extraction/", () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, "lib/image-file.ts"), "utf8");
  assert.ok(!source.includes("content-extraction"));
  assert.ok(!source.includes("image-map.json"));
});
