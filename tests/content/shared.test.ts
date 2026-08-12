import test from "node:test";
import assert from "node:assert/strict";
import {
  ImageEntrySchema,
  MigrationMetadataSchema,
  RelatedContentRefSchema,
  SlugSchema,
} from "../../content-lib/schemas/index.ts";
import { makeImageEntry, makeMigrationMetadata, makeRelatedContentRef } from "./fixtures/index.ts";

// ---------------------------------------------------------------------------
// M. Invalid slug fails / N. Valid slug passes
// ---------------------------------------------------------------------------

test("N: valid slugs pass", () => {
  for (const slug of [
    "sri-rangam",
    "tirukkozhi-urayur",
    "tirudwarkai-dwarka",
    "tiruparkadal-ksheerabdi",
  ]) {
    assert.equal(SlugSchema.safeParse(slug).success, true, `expected "${slug}" to pass`);
  }
});

test("M: invalid slugs fail", () => {
  for (const slug of ["Sri Rangam", "sri_rangam", "sri--rangam", "-sri-rangam", "sri-rangam-"]) {
    assert.equal(SlugSchema.safeParse(slug).success, false, `expected "${slug}" to fail`);
  }
});

// ---------------------------------------------------------------------------
// H. Image altStatus defaults to needs-review / I. alt may be null
// ---------------------------------------------------------------------------

test("H: image altStatus defaults to needs-review when omitted", () => {
  const parsed = ImageEntrySchema.parse({
    assetId: "example-image-2",
    sourceAssetUuid: "00000000-0000-4000-8000-000000000002",
    sourceOriginalName: "example-photo-2.jpg",
    alt: null,
  });
  assert.equal(parsed.altStatus, "needs-review");
});

test("I: image alt may be explicitly null", () => {
  const parsed = ImageEntrySchema.parse(makeImageEntry({ alt: null }));
  assert.equal(parsed.alt, null);
});

test("image alt may also be a real string when supplied", () => {
  const parsed = ImageEntrySchema.parse(makeImageEntry({ alt: "Example alt text." }));
  assert.equal(parsed.alt, "Example alt text.");
});

// ---------------------------------------------------------------------------
// G. The same synthetic assetId/sourceAssetUuid can appear in more than one
//    independent record without the schema rejecting either. The schema
//    layer has no cross-record state at all, so this is really proving
//    that parsing one record never mutates/registers anything that a
//    second, independent parse call could collide with.
// ---------------------------------------------------------------------------

test("G: the same asset may appear on two independent image entries", () => {
  const shared = makeImageEntry({
    assetId: "shared-example-image",
    sourceAssetUuid: "00000000-0000-4000-8000-0000000000ff",
  });

  const first = ImageEntrySchema.safeParse(shared);
  const second = ImageEntrySchema.safeParse(shared);

  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(first.data?.assetId, second.data?.assetId);
});

// ---------------------------------------------------------------------------
// U. RelatedContent accepts the defined reference shape /
// V. Invalid relatedContent shape fails
// ---------------------------------------------------------------------------

test("U: a valid relatedContent reference parses", () => {
  const result = RelatedContentRefSchema.safeParse(makeRelatedContentRef());
  assert.equal(result.success, true);
});

test("U: relatedContent accepts each defined content type", () => {
  for (const type of ["divya-desam", "book", "chapter", "knowledge"] as const) {
    const result = RelatedContentRefSchema.safeParse(
      makeRelatedContentRef({ type, slug: "example-target" })
    );
    assert.equal(result.success, true, `expected type "${type}" to be accepted`);
  }
});

test("V: relatedContent with an unknown type fails", () => {
  const result = RelatedContentRefSchema.safeParse({
    type: "temple", // not one of the defined types
    slug: "example-target",
  });
  assert.equal(result.success, false);
});

test("V: relatedContent missing slug fails", () => {
  const result = RelatedContentRefSchema.safeParse({ type: "knowledge" });
  assert.equal(result.success, false);
});

test("V: relatedContent with an invalid (non-kebab-case) slug fails", () => {
  const result = RelatedContentRefSchema.safeParse({
    type: "knowledge",
    slug: "Not A Slug",
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// W. Migration metadata requires sourcePageId and extractionConfidence
// ---------------------------------------------------------------------------

test("W: migration metadata requires sourcePageId", () => {
  const result = MigrationMetadataSchema.safeParse({
    extractionConfidence: "high",
    needsReview: false,
  });
  assert.equal(result.success, false);
});

test("W: migration metadata requires extractionConfidence", () => {
  const result = MigrationMetadataSchema.safeParse({
    sourcePageId: "test-source-page-1",
    needsReview: false,
  });
  assert.equal(result.success, false);
});

test("W: migration metadata requires extractionConfidence to be a known value", () => {
  const result = MigrationMetadataSchema.safeParse({
    sourcePageId: "test-source-page-1",
    extractionConfidence: "very-high", // not "high" | "medium" | "low"
    needsReview: false,
  });
  assert.equal(result.success, false);
});

test('W: extractionConfidence accepts "medium" (the real value observed on all 56 non-temple source records, discovered in Phase 5H)', () => {
  const result = MigrationMetadataSchema.safeParse({
    sourcePageId: "test-source-page-1",
    extractionConfidence: "medium",
    needsReview: false,
  });
  assert.equal(result.success, true);
});

test("W: a fully-specified migration metadata object parses", () => {
  const result = MigrationMetadataSchema.safeParse(makeMigrationMetadata());
  assert.equal(result.success, true);
});
