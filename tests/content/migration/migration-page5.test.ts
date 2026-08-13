import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DivyaDesamSchema } from "../../../content-lib/schemas/index.ts";
import {
  adaptExtractionDivyaDesamRecord,
  adaptImageRegistry,
} from "../../../scripts/migration/adapters/extraction-source-adapter.ts";
import { transformDivyaDesam } from "../../../scripts/migration/divya-desam.ts";
import { generateSlugFromTitle } from "../../../scripts/migration/slug.ts";

/**
 * Phase 5F focused integrity tests for the single real migrated record:
 * Sri Rangam / page.Page5.
 *
 * These tests READ content-extraction/divya-desams/page.Page5.json,
 * content-extraction/image-map.json, and
 * content-extraction/resources/external-links.json directly (permitted
 * for this one record only, per Phase 5F scope) purely to independently
 * verify the already-generated content/divya-desams/sri-rangam.json --
 * they never write to content-extraction/ and never regenerate the
 * output file themselves (that already happened once, via
 * `node scripts/migration/migrate-page5.ts`).
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SOURCE_FILE = path.join(REPO_ROOT, "content-extraction/divya-desams/page.Page5.json");
const IMAGE_MAP_FILE = path.join(REPO_ROOT, "content-extraction/image-map.json");
const EXTERNAL_LINKS_FILE = path.join(REPO_ROOT, "content-extraction/resources/external-links.json");
const OUTPUT_DIR = path.join(REPO_ROOT, "content/divya-desams");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sri-rangam.json");

// Recorded at the start of Phase 5F, before migration ran.
const EXPECTED_SOURCE_SHA256 = "ae2fb2ea8afdfc123e91247051e1314878ff759202d66620020fc11b6d6f4660";

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// ---------------------------------------------------------------------------
// A. exactly one output file exists.
//
// UPDATED IN PHASE 5H: at the time this test was written (Phase 5F), it
// was true that content/divya-desams/ contained ONLY sri-rangam.json --
// that was a real, correct assertion of Phase 5F's own scope limit (a
// single-record rehearsal). Phase 5H has since run the full, approved
// 108-record migration, so content/divya-desams/ now legitimately
// contains 107 files (108 minus Page150, held back). This test now
// verifies the part of its original intent that still holds: sri-rangam.json
// specifically exists and is untouched, which is exactly what Phase 5F's
// rehearsal was meant to prove and what Phase 5H's non-overwrite guarantee
// was meant to preserve. Phase 5H's own reconciliation tests
// (migration-full.test.ts) assert the full 107-file count precisely.
// ---------------------------------------------------------------------------

test("A: content/divya-desams/sri-rangam.json exists (the Phase 5F single-record rehearsal output, preserved through Phase 5H)", () => {
  const files = fs.readdirSync(OUTPUT_DIR);
  assert.ok(files.includes("sri-rangam.json"), "sri-rangam.json is missing from content/divya-desams/");
});

// ---------------------------------------------------------------------------
// T. content-extraction source file remains unchanged (checked first,
// since every other test in this file depends on that being true).
// ---------------------------------------------------------------------------

test("T: content-extraction/divya-desams/page.Page5.json is byte-for-byte unchanged", () => {
  const actualHash = crypto.createHash("sha256").update(fs.readFileSync(SOURCE_FILE)).digest("hex");
  assert.equal(actualHash, EXPECTED_SOURCE_SHA256);
});

// ---------------------------------------------------------------------------
// The rest of the tests load both the raw source and the generated output.
// ---------------------------------------------------------------------------

const rawSource = readJson(SOURCE_FILE);
const output = readJson(OUTPUT_FILE);

test("B: migration.sourcePageId is page.Page5", () => {
  assert.equal(output.migration.sourcePageId, "page.Page5");
  assert.equal(rawSource.pageId, "page.Page5");
});

test("C: slug matches deterministic slug generation from the actual source title", () => {
  // Independently re-derived via the same pure function, not hand-typed.
  assert.equal(output.slug, generateSlugFromTitle(rawSource.title));
  assert.equal(output.slug, "sri-rangam");
});

test("D: displayName is exactly the source title", () => {
  assert.equal(output.displayName, rawSource.title);
  assert.equal(output.displayName, "Sri Rangam");
});

test("E: status is draft", () => {
  assert.equal(output.status, "draft");
});

test("F: extractionConfidence is preserved from the source classification", () => {
  assert.equal(output.migration.extractionConfidence, rawSource.classification.confidence);
  assert.equal(output.migration.extractionConfidence, "high");
});

test("G: needsReview is consistent with the source classification category", () => {
  assert.equal(rawSource.classification.category, "divya_desam_candidate");
  assert.equal(output.migration.needsReview, false);
});

// ---------------------------------------------------------------------------
// H. structured temple fields -- independently re-derived from the raw
// source text using simple, parser-independent string operations (not by
// calling parseTempleDetails again), to avoid a tautological test.
// ---------------------------------------------------------------------------

function extractBetween(text: string, afterLabel: string, beforeLabel: string | null): string {
  const start = text.indexOf(afterLabel);
  assert.ok(start !== -1, `label "${afterLabel}" not found in source text`);
  const contentStart = start + afterLabel.length;
  const end = beforeLabel ? text.indexOf(beforeLabel, contentStart) : text.length;
  assert.ok(end !== -1, `boundary label "${beforeLabel}" not found in source text`);
  return text.slice(contentStart, end).trim();
}

const kshethramBlock = rawSource.contentBlocks.find(
  (b: any) => typeof b.content === "string" && b.content.includes("Details of Kshethram")
).content as string;

test("H: templeInformation fields match the source's actual labeled values", () => {
  assert.equal(output.templeInformation.moolavar, extractBetween(kshethramBlock, "Moolavar:", "Thayaar:"));
  assert.equal(output.templeInformation.thayaar, extractBetween(kshethramBlock, "Thayaar:", "Vimanam:"));
  assert.equal(output.templeInformation.vimanam, extractBetween(kshethramBlock, "Vimanam:", "Pushkarani:"));
  assert.equal(output.templeInformation.theertham, extractBetween(kshethramBlock, "Pushkarani:", "Travel:"));
  assert.equal(output.templeInformation.travelNote, extractBetween(kshethramBlock, "Travel:", "Azhwar Pasuram:"));

  // Spot-check the actual values, not just internal cross-consistency.
  assert.equal(output.templeInformation.moolavar, "Sri Ranganathar Perumaal");
  assert.equal(output.templeInformation.thayaar, "Sri Ranagnayaki Thayaar");
  assert.equal(output.templeInformation.vimanam, "Pranavaakara Vimanam");
  assert.equal(output.templeInformation.theertham, "Chandra Pushkarani");
  assert.equal(output.templeInformation.travelNote, "This kshethram is located 8 km from Trichy.");
});

// ---------------------------------------------------------------------------
// I. Sthala Puranam preserved verbatim.
// ---------------------------------------------------------------------------

const sthalaPuranamBlock = rawSource.contentBlocks.find(
  (b: any) => typeof b.content === "string" && b.content.includes("Sthala Puranam")
).content as string;

test("I: sthalaPuranam equals the source text after its label, independently extracted", () => {
  const expected = extractBetween(sthalaPuranamBlock, "Sthala Puranam :", null);
  assert.equal(output.sthalaPuranam, expected);
  // Length sanity check guards against silent truncation.
  assert.ok(output.sthalaPuranam.length > 3000, "expected a long-form narrative, not a truncated fragment");
  assert.match(output.sthalaPuranam, /^The idol as we see it today/);
  assert.match(output.sthalaPuranam, /Muktinath$/);
});

// ---------------------------------------------------------------------------
// J. Azhwar Pasuram preserved verbatim.
// ---------------------------------------------------------------------------

test("J: azhwarPasuram equals the source text after its label, independently extracted", () => {
  const expected = extractBetween(kshethramBlock, "Azhwar Pasuram:", null);
  assert.equal(output.azhwarPasuram, expected);
  assert.match(output.azhwarPasuram, /^Periya Azhwar: 35 Pasurams/);
  assert.match(output.azhwarPasuram, /Total: 247 Pasurams$/);
});

// ---------------------------------------------------------------------------
// K, L, M. Image references complete, correct UUIDs, correct metadata defaults.
// ---------------------------------------------------------------------------

// Phase 6E appended 2 additional images sourced from "108 Divyadesam 2nd
// Edition.pdf" (assetId "sri-rangam-book-N") on top of the original 2
// SAP-migrated images (assetId "sri-rangam-N"); a later review found both
// were near-duplicates of the originals and removed them (see
// source-material/reports/phase-6E-image-fixes-report.md), so Sri
// Rangam's images[] is currently just the 2 originals again. The filter
// below is kept (rather than using output.images directly) so the K/L/
// image-map.json tests below stay explicitly scoped to "the original SAP
// migration's own behavior" and would still pass unmodified if a future
// book-sourced addition survives review.
const originalSapImages = output.images.filter((i: any) => !i.assetId.includes("-book-"));

test("K & L: image references are complete and every sourceAssetUuid matches Page5's actual imageAssetRefs", () => {
  assert.equal(originalSapImages.length, rawSource.imageAssetRefs.length);
  assert.deepEqual(
    originalSapImages.map((i: any) => i.sourceAssetUuid).sort(),
    [...rawSource.imageAssetRefs].sort()
  );
});

test("M: every image has altStatus needs-review, alt null, and a distinct record-scoped assetId", () => {
  for (const image of output.images) {
    assert.equal(image.altStatus, "needs-review");
    assert.equal(image.alt, null);
    assert.match(image.assetId, /^sri-rangam-(book-)?\d+$/);
  }
  const assetIds = output.images.map((i: any) => i.assetId);
  assert.equal(new Set(assetIds).size, assetIds.length);
});

test("image sourceOriginalName values match image-map.json (original SAP-migrated images only)", () => {
  const imageMap = readJson(IMAGE_MAP_FILE);
  for (const image of originalSapImages) {
    const entry = imageMap.images.find((e: any) => e.assetUuid === image.sourceAssetUuid);
    assert.ok(entry, `no image-map.json entry for ${image.sourceAssetUuid}`);
    assert.equal(image.sourceOriginalName, entry.sourceOriginalName);
  }
});

// ---------------------------------------------------------------------------
// N. Maps links complete.
// ---------------------------------------------------------------------------

test("N: shrines[] contains exactly Page5's Maps links, correctly transformed", () => {
  const sourceMapsLinks = rawSource.externalLinks.filter((l: any) => l.resourceType === "google_maps_location");
  assert.equal(output.shrines.length, sourceMapsLinks.length);
  assert.equal(output.shrines.length, 1);
  assert.equal(output.shrines[0].mapsLink, sourceMapsLinks[0].url);
  // sourceComponentLabel was the generic "Maps" -> normalized to null.
  assert.equal(sourceMapsLinks[0].sourceComponentLabel, "Maps");
  assert.equal(output.shrines[0].label, null);
});

// ---------------------------------------------------------------------------
// O. PDF resources complete.
// ---------------------------------------------------------------------------

test("O: resources[] contains exactly Page5's PDF links, with correct languages", () => {
  const sourcePdfLinks = rawSource.externalLinks.filter((l: any) => l.resourceType === "sloka_pdf_prapatti");
  assert.equal(output.resources.length, sourcePdfLinks.length);
  assert.equal(output.resources.length, 4);
  assert.deepEqual(
    output.resources.map((r: any) => r.language).sort(),
    ["English", "Kannada", "Sanskrit", "Tamil"]
  );
});

// ---------------------------------------------------------------------------
// P. URLs preserved verbatim.
// ---------------------------------------------------------------------------

test("P: every URL in the output is byte-for-byte identical to a source URL", () => {
  const sourceUrls = new Set(rawSource.externalLinks.map((l: any) => l.url));
  for (const shrine of output.shrines) assert.ok(sourceUrls.has(shrine.mapsLink), `unexpected shrine URL: ${shrine.mapsLink}`);
  for (const resource of output.resources) assert.ok(sourceUrls.has(resource.url), `unexpected resource URL: ${resource.url}`);
});

// ---------------------------------------------------------------------------
// Q. presentation-only source blocks/metadata are not migrated.
// ---------------------------------------------------------------------------

test("Q: no presentation metadata (button labels as content, depth, order, componentId, textFontSizeHint) leaks into the output", () => {
  const serialized = JSON.stringify(output);
  assert.doesNotMatch(serialized, /"depth"/);
  assert.doesNotMatch(serialized, /"order":\s*0/); // chapter/order is legitimate on Chapter, not DivyaDesam at all
  assert.doesNotMatch(serialized, /textFontSizeHint/);
  assert.doesNotMatch(serialized, /componentId/);
  assert.doesNotMatch(serialized, /ag-asset:\/\//); // the raw SAP URI scheme must never appear in the destination
  // The button blocks' own labels ("Maps", "English Pasuram", etc.) are
  // legitimately preserved -- but only as resources[].sourceLabel /
  // via the shrine-label normalization, never as free-standing content.
  assert.equal(output.hasOwnProperty("contentBlocks"), false);
});

// ---------------------------------------------------------------------------
// R. output passes DivyaDesamSchema.
// ---------------------------------------------------------------------------

test("R: the generated file independently passes DivyaDesamSchema", () => {
  const result = DivyaDesamSchema.safeParse(output);
  assert.equal(result.success, true);
});

// ---------------------------------------------------------------------------
// S. transformation is deterministic (re-run the adapter + transformer
// in-memory against the same source files and compare to the file
// already on disk).
// ---------------------------------------------------------------------------

test("S: re-running the adapter + transformer against the same source produces an identical result", () => {
  const imageMap = readJson(IMAGE_MAP_FILE);
  const externalLinksData = readJson(EXTERNAL_LINKS_FILE);
  const page5Links = externalLinksData.links.filter((l: any) => l.pageId === "page.Page5");

  const source = adaptExtractionDivyaDesamRecord(rawSource, page5Links);
  const imageRegistry = adaptImageRegistry(imageMap.images, rawSource.imageAssetRefs);
  const recomputed = transformDivyaDesam(source, { imageRegistry });

  // Phase 6E appended 2 additional images sourced from "108 Divyadesam
  // 2nd Edition.pdf" on top of the original 2 SAP-migrated images -- a
  // disclosed, intentional addition, not migration drift. A later review
  // (see source-material/reports/phase-6E-image-fixes-report.md) found
  // both of those 2 additions were near-duplicates of the original 2
  // images (same photograph, re-scanned) and removed them, so Sri
  // Rangam's images[] is currently back to exactly the 2 original
  // SAP-migrated images -- this test's job is confirming the SAP
  // migration transform itself is still pure/deterministic, which now
  // holds as a plain field-for-field comparison including images.
  assert.deepEqual(recomputed, output);
});
