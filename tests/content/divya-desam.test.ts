import test from "node:test";
import assert from "node:assert/strict";
import { DivyaDesamSchema } from "../../content-lib/schemas/index.ts";
import {
  makeDivyaDesamInput,
  makeFullDivyaDesamInput,
  makeImageEntry,
  makeMigrationMetadata,
  makeResourceEntry,
  makeShrine,
} from "./fixtures/index.ts";

// ---------------------------------------------------------------------------
// A. Valid Divya Desam parses.
// ---------------------------------------------------------------------------

test("A: a minimal valid Divya Desam parses", () => {
  const result = DivyaDesamSchema.safeParse(makeDivyaDesamInput());
  assert.equal(result.success, true);
});

test("A: a fully-populated Divya Desam parses", () => {
  const result = DivyaDesamSchema.safeParse(makeFullDivyaDesamInput());
  assert.equal(result.success, true);
});

// ---------------------------------------------------------------------------
// B. Divya Desam status defaults to draft.
// ---------------------------------------------------------------------------

test("B: status defaults to draft when omitted", () => {
  const parsed = DivyaDesamSchema.parse(makeDivyaDesamInput());
  assert.equal(parsed.status, "draft");
});

test("status may be explicitly set to published", () => {
  const parsed = DivyaDesamSchema.parse(makeDivyaDesamInput({ status: "published" }));
  assert.equal(parsed.status, "published");
});

// ---------------------------------------------------------------------------
// C. Divya Desam accepts missing optional templeInformation fields.
// ---------------------------------------------------------------------------

test("C: templeInformation may omit any/all fields", () => {
  const parsed = DivyaDesamSchema.parse(
    makeDivyaDesamInput({ templeInformation: { moolavar: "Example Moolavar" } })
  );
  assert.equal(parsed.templeInformation.moolavar, "Example Moolavar");
  assert.equal(parsed.templeInformation.thayaar, undefined);
  assert.equal(parsed.templeInformation.vimanam, undefined);
  assert.equal(parsed.templeInformation.theertham, undefined);
  assert.equal(parsed.templeInformation.travelNote, undefined);
});

test("C: templeInformation itself may be omitted entirely", () => {
  const parsed = DivyaDesamSchema.parse(makeDivyaDesamInput());
  assert.deepEqual(parsed.templeInformation, {});
});

// ---------------------------------------------------------------------------
// D. Divya Desam accepts zero shrines. / E. accepts multiple shrines.
// ---------------------------------------------------------------------------

test("D: shrines defaults to an empty array when omitted", () => {
  const parsed = DivyaDesamSchema.parse(makeDivyaDesamInput());
  assert.deepEqual(parsed.shrines, []);
});

test("D: an explicit empty shrines array is accepted", () => {
  const parsed = DivyaDesamSchema.parse(makeDivyaDesamInput({ shrines: [] }));
  assert.deepEqual(parsed.shrines, []);
});

test("E: multiple shrines (with distinguishing labels) are accepted on one record", () => {
  const parsed = DivyaDesamSchema.parse(
    makeDivyaDesamInput({
      shrines: [
        makeShrine({ label: "Example Shrine A", mapsLink: "https://example.com/maps/a" }),
        makeShrine({ label: "Example Shrine B", mapsLink: "https://example.com/maps/b" }),
        makeShrine({ label: null, mapsLink: "https://example.com/maps/c" }),
      ],
    })
  );
  assert.equal(parsed.shrines.length, 3);
  // Non-negotiable per Phase 5A/5B: multiple shrines stay on ONE record.
  assert.equal(parsed.slug, "example-temple");
});

// ---------------------------------------------------------------------------
// F. Divya Desam accepts multiple images.
// ---------------------------------------------------------------------------

test("F: multiple images are accepted on one record", () => {
  const parsed = DivyaDesamSchema.parse(
    makeDivyaDesamInput({
      images: [
        makeImageEntry({ assetId: "example-image-a" }),
        makeImageEntry({ assetId: "example-image-b" }),
        makeImageEntry({ assetId: "example-image-c" }),
      ],
    })
  );
  assert.equal(parsed.images.length, 3);
});

// ---------------------------------------------------------------------------
// J. All five normalized resource languages are accepted.
// ---------------------------------------------------------------------------

test("J: all five normalized resource languages are accepted", () => {
  const languages = ["English", "Tamil", "Kannada", "Sanskrit", "Devanagari"] as const;
  const parsed = DivyaDesamSchema.parse(
    makeDivyaDesamInput({
      resources: languages.map((language) =>
        makeResourceEntry({
          language,
          url: `https://example.com/resources/example-${language.toLowerCase()}.pdf`,
        })
      ),
    })
  );
  assert.deepEqual(
    parsed.resources.map((r) => r.language),
    [...languages]
  );
});

test("an unrecognized resource language is rejected", () => {
  const result = DivyaDesamSchema.safeParse(
    makeDivyaDesamInput({
      resources: [makeResourceEntry({ language: "French" as never })],
    })
  );
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// K. Invalid resource URL fails.
// ---------------------------------------------------------------------------

test("K: an invalid resource URL fails", () => {
  const result = DivyaDesamSchema.safeParse(
    makeDivyaDesamInput({
      resources: [makeResourceEntry({ url: "not-a-valid-url" })],
    })
  );
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// L. Invalid Maps URL fails.
// ---------------------------------------------------------------------------

test("L: an invalid shrine Maps URL fails", () => {
  const result = DivyaDesamSchema.safeParse(
    makeDivyaDesamInput({
      shrines: [makeShrine({ mapsLink: "definitely not a url" })],
    })
  );
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// X. extractionConfidence does not automatically change status.
// ---------------------------------------------------------------------------

test("X: extractionConfidence \"high\" does not cause status to become published", () => {
  const parsed = DivyaDesamSchema.parse(
    makeDivyaDesamInput({ migration: makeMigrationMetadata({ extractionConfidence: "high" }) })
  );
  assert.equal(parsed.status, "draft");
});

test("X: extractionConfidence \"low\" also leaves status at the same default", () => {
  const parsed = DivyaDesamSchema.parse(
    makeDivyaDesamInput({ migration: makeMigrationMetadata({ extractionConfidence: "low" }) })
  );
  assert.equal(parsed.status, "draft");
});

// ---------------------------------------------------------------------------
// Y. needsReview can be true while status remains draft.
// ---------------------------------------------------------------------------

test("Y: needsReview=true coexists with status=draft (models Page93/Page150's eventual shape)", () => {
  const parsed = DivyaDesamSchema.parse(
    makeDivyaDesamInput({
      migration: makeMigrationMetadata({ extractionConfidence: "low", needsReview: true }),
    })
  );
  assert.equal(parsed.migration.needsReview, true);
  assert.equal(parsed.status, "draft");
});
