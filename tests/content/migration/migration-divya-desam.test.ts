import test from "node:test";
import assert from "node:assert/strict";
import { transformDivyaDesam } from "../../../scripts/migration/divya-desam.ts";
import { holdBackUnresolvedRecord } from "../../../scripts/migration/held-back.ts";
import { LinkAssociationMismatchError } from "../../../scripts/migration/errors.ts";
import { DivyaDesamSchema } from "../../../content-lib/schemas/index.ts";
import {
  buildKshethramDetailsText,
  buildSthalaPuranamText,
  makeButtonBlock,
  makeDivyaDesamSource,
  makeGenericSource,
  makeImageRegistry,
  makeImageRegistryEntry,
  makeMapsLink,
  makePdfLink,
  makePictureBlock,
  makeTextBlock,
} from "../../../scripts/fixtures/synthetic-source.ts";

const REGISTRY = makeImageRegistry([
  makeImageRegistryEntry({ assetUuid: "11111111-1111-4111-8111-111111111111", sourceOriginalName: "example-photo.jpg" }),
]);
const CONTEXT = { imageRegistry: REGISTRY };

// ---------------------------------------------------------------------------
// A. title -> displayName.
// ---------------------------------------------------------------------------

test("A: source.title is preserved verbatim as displayName", () => {
  const source = makeDivyaDesamSource({ title: "Example Shrine — Ṭest Ñame" });
  const result = transformDivyaDesam(source, CONTEXT);
  assert.equal(result.displayName, "Example Shrine — Ṭest Ñame");
});

// ---------------------------------------------------------------------------
// G. extraction metadata mapping.
// ---------------------------------------------------------------------------

test("G: pageId/classification map to migration.sourcePageId/extractionConfidence", () => {
  const source = makeDivyaDesamSource({
    pageId: "page.TestTemple42",
    classification: { category: "divya_desam_candidate", confidence: "high" },
  });
  const result = transformDivyaDesam(source, CONTEXT);
  assert.equal(result.migration.sourcePageId, "page.TestTemple42");
  assert.equal(result.migration.extractionConfidence, "high");
});

// ---------------------------------------------------------------------------
// H. Universal draft status regardless of confidence.
// ---------------------------------------------------------------------------

test("H: a high-confidence record is still status: draft", () => {
  const source = makeDivyaDesamSource({ classification: { category: "divya_desam_candidate", confidence: "high" } });
  assert.equal(transformDivyaDesam(source, CONTEXT).status, "draft");
});

test("H: a low-confidence record is also status: draft (never anything else)", () => {
  const source = makeDivyaDesamSource({
    classification: { category: "unresolved_possible_divya_desam", confidence: "low" },
    externalLinks: [], // no maps link -- matches the real low-confidence shape
  });
  assert.equal(transformDivyaDesam(source, CONTEXT).status, "draft");
});

// ---------------------------------------------------------------------------
// I. unresolved_possible_divya_desam -> needsReview true, status draft.
// No editorial decision about final content type is made here.
// ---------------------------------------------------------------------------

test("I: classification.category unresolved_possible_divya_desam sets needsReview true and status stays draft", () => {
  const source = makeDivyaDesamSource({
    classification: { category: "unresolved_possible_divya_desam", confidence: "low" },
  });
  const result = transformDivyaDesam(source, CONTEXT);
  assert.equal(result.migration.needsReview, true);
  assert.equal(result.status, "draft");
});

test("a confidently-classified record has needsReview false", () => {
  const source = makeDivyaDesamSource({
    classification: { category: "divya_desam_candidate", confidence: "high" },
  });
  assert.equal(transformDivyaDesam(source, CONTEXT).migration.needsReview, false);
});

// ---------------------------------------------------------------------------
// R. Button blocks are presentation metadata, never destination content.
// ---------------------------------------------------------------------------

test("R: a button block's label text never leaks into sthalaPuranam/templeInformation/azhwarPasuram", () => {
  const source = makeDivyaDesamSource({
    contentBlocks: [
      makeTextBlock("Example Shrine"),
      makePictureBlock("11111111-1111-4111-8111-111111111111"),
      makeTextBlock(buildKshethramDetailsText()),
      makeButtonBlock("THIS-BUTTON-LABEL-MUST-NOT-APPEAR-ANYWHERE"),
      makeButtonBlock("English Pasuram"),
      makeTextBlock(buildSthalaPuranamText()),
    ],
  });
  const result = transformDivyaDesam(source, CONTEXT);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /THIS-BUTTON-LABEL-MUST-NOT-APPEAR-ANYWHERE/);
});

// ---------------------------------------------------------------------------
// AE. Inconsistent page/resource association fails rather than silently
// attaching a link to the wrong record.
// ---------------------------------------------------------------------------

test("AE: an external link declaring a different pageId than the record being transformed fails", () => {
  const source = makeDivyaDesamSource({
    pageId: "page.TestTempleReal",
    externalLinks: [makeMapsLink({ pageId: "page.TestTempleWRONG" })],
  });
  assert.throws(() => transformDivyaDesam(source, CONTEXT), (err: unknown) => {
    assert.ok(err instanceof LinkAssociationMismatchError);
    assert.equal(err.expectedPageId, "page.TestTempleReal");
    assert.equal(err.actualPageId, "page.TestTempleWRONG");
    return true;
  });
});

test("AE: a link with no pageId declared at all (matching the real per-record shape) is accepted without complaint", () => {
  const source = makeDivyaDesamSource({
    pageId: "page.TestTempleReal",
    externalLinks: [makeMapsLink({ pageId: undefined })],
  });
  assert.doesNotThrow(() => transformDivyaDesam(source, CONTEXT));
});

// ---------------------------------------------------------------------------
// AF. No source fields are fabricated.
// ---------------------------------------------------------------------------

test("AF: a record with no Sthala Puranam label anywhere results in an absent (not fabricated) sthalaPuranam field", () => {
  // buildKshethramDetailsText() always includes an "Azhwar Pasuram:"
  // section by construction (it models the real source's combined
  // block), but never includes "Sthala Puranam:" unless
  // buildSthalaPuranamText() is also included -- which it deliberately
  // is not here.
  const source = makeDivyaDesamSource({
    contentBlocks: [makeTextBlock("Example Shrine"), makeTextBlock(buildKshethramDetailsText())],
    imageAssetRefs: [],
    externalLinks: [],
  });
  const result = transformDivyaDesam(source, CONTEXT);
  assert.equal(result.sthalaPuranam, undefined);
});

test("AF: a record with neither Sthala Puranam nor Azhwar Pasuram labels present has both fields absent", () => {
  const source = makeDivyaDesamSource({
    contentBlocks: [
      makeTextBlock("Example Shrine"),
      makeTextBlock("Moolavar: Example Deity\nThayaar: Example Consort\n"),
    ],
    imageAssetRefs: [],
    externalLinks: [],
  });
  const result = transformDivyaDesam(source, CONTEXT);
  assert.equal(result.sthalaPuranam, undefined);
  assert.equal(result.azhwarPasuram, undefined);
  assert.equal(result.templeInformation.moolavar, "Example Deity");
});

test("AF: with zero images/shrines/resources in the source, the destination arrays are empty, never invented", () => {
  const source = makeDivyaDesamSource({ imageAssetRefs: [], externalLinks: [], contentBlocks: [makeTextBlock("Example Shrine")] });
  const result = transformDivyaDesam(source, CONTEXT);
  assert.deepEqual(result.images, []);
  assert.deepEqual(result.shrines, []);
  assert.deepEqual(result.resources, []);
});

// ---------------------------------------------------------------------------
// Section 17: destination schema validation, proven independently by the
// test (not merely trusted from the transformer's internal .parse call).
// ---------------------------------------------------------------------------

test("the transformer's output independently passes DivyaDesamSchema", () => {
  const result = transformDivyaDesam(makeDivyaDesamSource(), CONTEXT);
  const revalidated = DivyaDesamSchema.safeParse(result);
  assert.equal(revalidated.success, true);
});

// ---------------------------------------------------------------------------
// Section 14: a Page93-style fixture (unresolved, but structurally
// temple-shaped) -- no editorial classification is made; it is simply
// migrated with needsReview + draft, like any other unresolved record.
// ---------------------------------------------------------------------------

test("a Page93-style synthetic fixture (temple-shaped, unresolved, no maps link) migrates as a draft/needsReview DivyaDesam without editorial resolution", () => {
  const source = makeDivyaDesamSource({
    pageId: "page.TestAmbiguousTemple",
    title: "Example Ambiguous Shrine",
    classification: { category: "unresolved_possible_divya_desam", confidence: "low" },
    externalLinks: [makePdfLink()], // has a PDF link but deliberately NO maps link, mirroring the real shape
  });
  const result = transformDivyaDesam(source, CONTEXT);
  assert.equal(result.status, "draft");
  assert.equal(result.migration.needsReview, true);
  assert.equal(result.migration.extractionConfidence, "low");
  assert.deepEqual(result.shrines, []);
  // The transformer does NOT decide "this is/isn't really a temple" --
  // it just faithfully preserves the structurally-temple-shaped content
  // as a draft DivyaDesam pending human review.
});

// ---------------------------------------------------------------------------
// Section 13: a Page150-style fixture -- content whose destination TYPE
// is not decided. Must be preservable WITHOUT being forced into
// DivyaDesam, Book/Chapter, or Knowledge.
// ---------------------------------------------------------------------------

test("a Page150-style synthetic fixture can be held back without being assigned to any destination content type", () => {
  const source = makeGenericSource({
    pageId: "page.TestUnresolvedStotram",
    title: "Example Unresolved Stotram",
    classification: { category: "unresolved_possible_divya_desam", confidence: "low" },
  });

  const held = holdBackUnresolvedRecord(source);

  assert.equal(held.sourcePageId, "page.TestUnresolvedStotram");
  assert.equal(held.title, "Example Unresolved Stotram");
  assert.equal(held.extractionConfidence, "low");
  assert.equal(held.needsReview, true);
  // Raw content is preserved verbatim, untransformed:
  assert.deepEqual(held.rawContentBlocks, source.contentBlocks);
  // External links (e.g. Page150's 4 PDF resource links, which live in
  // externalLinks rather than contentBlocks) are also preserved verbatim,
  // never dropped merely because the destination type is unresolved:
  assert.deepEqual(held.rawExternalLinks, source.externalLinks);
  assert.ok(held.rawExternalLinks.length > 0, "expected the fixture's external link to survive into the held-back record");
  // No slug, no displayName, no templeInformation, no body, no
  // contentType -- this is deliberately not shaped like any of the three
  // destination types, proving no editorial content-type decision was made.
  assert.equal("slug" in held, false);
  assert.equal("contentType" in held, false);
  assert.equal("templeInformation" in held, false);
});
