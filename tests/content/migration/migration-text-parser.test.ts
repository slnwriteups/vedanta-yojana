import test from "node:test";
import assert from "node:assert/strict";
import { parseTempleDetails } from "../../../scripts/migration/text-parser.ts";
import { AmbiguousLabelError } from "../../../scripts/migration/errors.ts";
import { buildKshethramDetailsText, buildSthalaPuranamText } from "../../../scripts/fixtures/synthetic-source.ts";

// ---------------------------------------------------------------------------
// J. Details of Kshethram parsing -- all five templeInformation fields.
// ---------------------------------------------------------------------------

test("J: a single combined block splits into all five templeInformation fields", () => {
  const text = buildKshethramDetailsText({
    moolavar: "Example Deity",
    thayaar: "Example Consort",
    vimanam: "Example Vimanam",
    theerthamValue: "Example Theertham",
    travelNote: "Example travel sentence.",
  });

  const parsed = parseTempleDetails(text);
  assert.equal(parsed.templeInformation.moolavar, "Example Deity");
  assert.equal(parsed.templeInformation.thayaar, "Example Consort");
  assert.equal(parsed.templeInformation.vimanam, "Example Vimanam");
  assert.equal(parsed.templeInformation.theertham, "Example Theertham");
  assert.equal(parsed.templeInformation.travelNote, "Example travel sentence.");
});

// ---------------------------------------------------------------------------
// K. Both Pushkarani: and Pushkarini: map to theertham.
// ---------------------------------------------------------------------------

test('K: "Pushkarani:" maps to templeInformation.theertham', () => {
  const text = buildKshethramDetailsText({ theerthamLabel: "Pushkarani", theerthamValue: "Example Theertham A" });
  assert.equal(parseTempleDetails(text).templeInformation.theertham, "Example Theertham A");
});

test('K: "Pushkarini:" (alternate spelling) also maps to templeInformation.theertham', () => {
  const text = buildKshethramDetailsText({ theerthamLabel: "Pushkarini", theerthamValue: "Example Theertham B" });
  assert.equal(parseTempleDetails(text).templeInformation.theertham, "Example Theertham B");
});

// ---------------------------------------------------------------------------
// L. Multiple recognized labels inside ONE block.
// ---------------------------------------------------------------------------

test("L: multiple labels within a single combined string are all recognized (not just the first)", () => {
  const text =
    "Moolavar: Example Deity\n" +
    "Thayaar: Example Consort\n" +
    "Vimanam: Example Vimanam\n" +
    "Pushkarani: Example Theertham\n" +
    "Travel: Example travel note.\n";
  const parsed = parseTempleDetails(text);
  assert.equal(Object.keys(parsed.templeInformation).length, 5);
});

// ---------------------------------------------------------------------------
// M. Missing labels are omitted, never fabricated.
// ---------------------------------------------------------------------------

test("M: a field whose label is absent from the source text is omitted, not fabricated", () => {
  const text = "Moolavar: Example Deity\nThayaar: Example Consort\n";
  const parsed = parseTempleDetails(text);
  assert.equal(parsed.templeInformation.moolavar, "Example Deity");
  assert.equal(parsed.templeInformation.thayaar, "Example Consort");
  assert.equal(parsed.templeInformation.vimanam, undefined);
  assert.equal(parsed.templeInformation.theertham, undefined);
  assert.equal(parsed.templeInformation.travelNote, undefined);
  assert.equal(parsed.sthalaPuranam, undefined);
  assert.equal(parsed.azhwarPasuram, undefined);
});

test("M: completely unlabeled text produces no fields at all", () => {
  const parsed = parseTempleDetails("Just some prose with no recognized labels at all.");
  assert.deepEqual(parsed.templeInformation, {});
  assert.equal(parsed.sthalaPuranam, undefined);
  assert.equal(parsed.azhwarPasuram, undefined);
});

// ---------------------------------------------------------------------------
// N. Sthala Puranam extraction, verbatim.
// ---------------------------------------------------------------------------

test("N: text after \"Sthala Puranam:\" maps verbatim to sthalaPuranam", () => {
  const narrative = "A distinctive synthetic narrative sentence used only for this test.";
  const parsed = parseTempleDetails(buildSthalaPuranamText(narrative));
  assert.equal(parsed.sthalaPuranam, narrative);
});

test('N: the source\'s occasional "Sthala Puranam :" (space before colon) is also recognized', () => {
  const parsed = parseTempleDetails("Sthala Puranam : \nExample narrative text.");
  assert.equal(parsed.sthalaPuranam, "Example narrative text.");
});

// ---------------------------------------------------------------------------
// O. Azhwar Pasuram extraction, verbatim.
// ---------------------------------------------------------------------------

test('O: text after "Azhwar Pasuram:" maps verbatim to azhwarPasuram', () => {
  const parsed = parseTempleDetails("Azhwar Pasuram:\nExample Azhwar: 3 example pasurams\nTotal: 3 example pasurams");
  assert.equal(parsed.azhwarPasuram, "Example Azhwar: 3 example pasurams\nTotal: 3 example pasurams");
});

// ---------------------------------------------------------------------------
// P. Both Sthala Puranam and Azhwar Pasuram in the same source block.
// ---------------------------------------------------------------------------

test("P: Sthala Puranam and Azhwar Pasuram in the same block are both extracted correctly", () => {
  const text =
    "Sthala Puranam:\nExample legend text here.\n\n" +
    "Azhwar Pasuram:\nExample Azhwar: 2 example pasurams";
  const parsed = parseTempleDetails(text);
  assert.equal(parsed.sthalaPuranam, "Example legend text here.");
  assert.equal(parsed.azhwarPasuram, "Example Azhwar: 2 example pasurams");
});

// ---------------------------------------------------------------------------
// Q. Preserve paragraph/newline structure; document the one normalization
// applied (boundary trim only).
// ---------------------------------------------------------------------------

test("Q: internal newlines/paragraph breaks are preserved exactly; only leading/trailing whitespace is trimmed", () => {
  const narrative = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph with  double  internal spaces.";
  const parsed = parseTempleDetails(buildSthalaPuranamText(narrative));
  assert.equal(parsed.sthalaPuranam, narrative);
});

test("Q: leading/trailing whitespace around a label's value is trimmed (the one documented normalization)", () => {
  const parsed = parseTempleDetails("Moolavar:   Example Deity   \nThayaar: Example Consort");
  assert.equal(parsed.templeInformation.moolavar, "Example Deity");
});

// ---------------------------------------------------------------------------
// Ambiguous label structure fails clearly rather than guessing.
// ---------------------------------------------------------------------------

test("the same field labeled twice throws AmbiguousLabelError rather than silently picking one", () => {
  const text = "Moolavar: Example Deity One\nMoolavar: Example Deity Two\n";
  assert.throws(() => parseTempleDetails(text), AmbiguousLabelError);
});

test("Pushkarani: and Pushkarini: both present in the same text (same destination field) is also ambiguous", () => {
  const text = "Pushkarani: Example A\nPushkarini: Example B\n";
  assert.throws(() => parseTempleDetails(text), AmbiguousLabelError);
});

// ---------------------------------------------------------------------------
// R (parser-level slice): a label-shaped string appearing only as a
// button's `label` (never passed to the parser as body text in the first
// place) obviously cannot leak in -- the full non-leaking guarantee for
// whole content blocks is proven at the transformer level
// (migration-divya-desam.test.ts), since parseTempleDetails itself only
// ever sees whatever string it's given.
// ---------------------------------------------------------------------------
