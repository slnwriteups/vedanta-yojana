import test from "node:test";
import assert from "node:assert/strict";
import { resolveImageAsset, resolveImageAssets } from "../../../scripts/migration/images.ts";
import { MissingImageAssetError } from "../../../scripts/migration/errors.ts";
import { ImageEntrySchema } from "../../../content-lib/schemas/index.ts";
import { makeImageRegistry, makeImageRegistryEntry } from "../../../scripts/fixtures/synthetic-source.ts";

// ---------------------------------------------------------------------------
// S. Image UUID resolution.
// ---------------------------------------------------------------------------

test("S: a known synthetic UUID resolves to a valid destination ImageEntry", () => {
  const registry = makeImageRegistry([
    makeImageRegistryEntry({ assetUuid: "11111111-1111-4111-8111-111111111111", sourceOriginalName: "example.jpg" }),
  ]);

  const entry = resolveImageAsset("11111111-1111-4111-8111-111111111111", registry, "example-temple", 1);

  assert.equal(entry.assetId, "example-temple-1");
  assert.equal(entry.sourceAssetUuid, "11111111-1111-4111-8111-111111111111");
  assert.equal(entry.sourceOriginalName, "example.jpg");
  assert.equal(entry.alt, null);
  assert.equal(entry.altStatus, "needs-review");
  assert.equal(ImageEntrySchema.safeParse(entry).success, true);
});

test("AD: an imageAssetRef UUID with no image-map entry fails clearly", () => {
  const registry = makeImageRegistry([]); // deliberately empty
  assert.throws(
    () => resolveImageAsset("22222222-2222-4222-8222-222222222222", registry, "example-temple", 1),
    (err: unknown) => {
      assert.ok(err instanceof MissingImageAssetError);
      assert.equal(err.sourceAssetUuid, "22222222-2222-4222-8222-222222222222");
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// T. The same synthetic asset shared between two different records.
// ---------------------------------------------------------------------------

test("T: the same sourceAssetUuid resolved for two different records keeps a shared identity but distinct record-level references", () => {
  const registry = makeImageRegistry([
    makeImageRegistryEntry({ assetUuid: "33333333-3333-4333-8333-333333333333", sourceOriginalName: "shared.jpg" }),
  ]);

  const forTemple = resolveImageAsset("33333333-3333-4333-8333-333333333333", registry, "example-temple", 1);
  const forChapter = resolveImageAsset("33333333-3333-4333-8333-333333333333", registry, "example-chapter", 1);

  // Shared underlying identity:
  assert.equal(forTemple.sourceAssetUuid, forChapter.sourceAssetUuid);
  assert.equal(forTemple.sourceOriginalName, forChapter.sourceOriginalName);

  // Distinct, record-scoped destination reference:
  assert.notEqual(forTemple.assetId, forChapter.assetId);
  assert.equal(forTemple.assetId, "example-temple-1");
  assert.equal(forChapter.assetId, "example-chapter-1");
});

test("resolveImageAssets assigns a deterministic, order-based sequence within one record", () => {
  const registry = makeImageRegistry([
    makeImageRegistryEntry({ assetUuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", sourceOriginalName: "a.jpg" }),
    makeImageRegistryEntry({ assetUuid: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", sourceOriginalName: "b.jpg" }),
  ]);
  const images = resolveImageAssets(
    ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
    registry,
    "example-temple"
  );
  assert.deepEqual(
    images.map((i) => i.assetId),
    ["example-temple-1", "example-temple-2"]
  );
});

// ---------------------------------------------------------------------------
// U. Duplicate-hash-but-different-UUID assets remain distinct (never merged).
// ---------------------------------------------------------------------------

test("U: two different synthetic UUIDs (simulating a duplicate-content pair) resolve to two fully distinct, unmerged ImageEntry objects", () => {
  const registry = makeImageRegistry([
    makeImageRegistryEntry({ assetUuid: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", sourceOriginalName: "duplicate-a.png" }),
    makeImageRegistryEntry({ assetUuid: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", sourceOriginalName: "duplicate-b.png" }),
  ]);

  const a = resolveImageAsset("cccccccc-cccc-4ccc-8ccc-cccccccccccc", registry, "example-temple", 1);
  const b = resolveImageAsset("dddddddd-dddd-4ddd-8ddd-dddddddddddd", registry, "example-temple", 2);

  assert.notEqual(a.sourceAssetUuid, b.sourceAssetUuid);
  assert.notEqual(a.assetId, b.assetId);
  // Neither entry's identity was altered by the other's existence.
  assert.equal(a.sourceOriginalName, "duplicate-a.png");
  assert.equal(b.sourceOriginalName, "duplicate-b.png");
});

// ---------------------------------------------------------------------------
// V. Extension mismatch metadata representable without altering identity.
// ---------------------------------------------------------------------------

test("V: an extensionMismatch-flagged registry entry still resolves with its original name unmodified", () => {
  const registry = makeImageRegistry([
    makeImageRegistryEntry({
      assetUuid: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      sourceOriginalName: "example-mislabeled.jpg", // e.g. actually GIF data in the real source's known case
      extensionMismatch: true,
    }),
  ]);

  const entry = resolveImageAsset("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", registry, "example-temple", 1);

  // The mismatch flag is informational on the registry only -- it never
  // causes a rename, re-encode, or any other change to what's resolved.
  assert.equal(entry.sourceOriginalName, "example-mislabeled.jpg");
  assert.equal(entry.sourceAssetUuid, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee");
});
