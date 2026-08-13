import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDivyaDesams, loadDivyaDesam } from "../../content-lib/loader/index.ts";

/**
 * Phase 5K -- tests for the Divya Desam presentation layer.
 *
 * No React rendering library is installed (out of scope for this phase,
 * per the Phase 5J/5K briefs), so these combine: (1) direct calls into
 * the SAME loader the pages use, against the real migrated baseline --
 * proving the data the pages would render is correct; and (2) static
 * source checks proving the pages/components actually consume that
 * loader rather than hard-coding records or bypassing it. Live HTTP
 * verification against a running dev server is done separately (see the
 * Phase 5K report) and is not repeated here.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

// ---------------------------------------------------------------------------
// A/B/J. Index page: loader-driven, links to real slugs, no hard-coding.
// ---------------------------------------------------------------------------

test("A: the Divya Desam index page imports and calls loadDivyaDesams()", () => {
  const source = read("app/divya-desams/page.tsx");
  assert.ok(source.includes("loadDivyaDesams"), "expected an import/call of loadDivyaDesams()");
  assert.ok(source.includes("@/content-lib/loader"), "expected the loader to be imported via @/content-lib/loader");
});

test("B: the Divya Desam card links use the record's own slug, not a literal path", () => {
  const source = read("components/divya-desams/DivyaDesamCard.tsx");
  assert.ok(source.includes("/divya-desams/${record.slug}"), "expected a template-literal link built from record.slug");
});

test("J: no application file hard-codes a list of Divya Desam names/slugs", () => {
  const indexSource = read("app/divya-desams/page.tsx");
  const cardSource = read("components/divya-desams/DivyaDesamCard.tsx");
  const detailSource = read("app/divya-desams/[slug]/page.tsx");
  for (const source of [indexSource, cardSource, detailSource]) {
    assert.ok(!/sri-rangam|tirukoodal|tanjai-mamanikoyil/i.test(source), "found a literal record slug/name hard-coded in application source");
  }
});

test("J/3: no application file reads content-extraction/ or scripts/migration/ directly", () => {
  const appFiles = listFilesRecursive(path.join(REPO_ROOT, "app"));
  const componentFiles = listFilesRecursive(path.join(REPO_ROOT, "components"));
  for (const file of [...appFiles, ...componentFiles]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(!source.includes("content-extraction"), `${file} references content-extraction`);
    assert.ok(!source.includes("scripts/migration"), `${file} references scripts/migration`);
  }
});

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// C. Detail page: loader-driven, notFound() on miss.
// ---------------------------------------------------------------------------

test("C: the Divya Desam detail page imports loadDivyaDesam and calls notFound() on a miss", () => {
  const source = read("app/divya-desams/[slug]/page.tsx");
  assert.ok(source.includes("loadDivyaDesam"), "expected loadDivyaDesam to be imported/used");
  assert.ok(source.includes("notFound()"), "expected a notFound() call for the missing-record case");
});

// ---------------------------------------------------------------------------
// D. Sri Rangam -- full real-data rendering surface available.
// ---------------------------------------------------------------------------

test("D: Sri Rangam has every field the detail page renders (temple info, Sthala Puranam, Azhwar Pasuram, resources, Maps link, images)", () => {
  const record = loadDivyaDesam("sri-rangam");
  assert.ok(record, "sri-rangam not found via loadDivyaDesam()");
  assert.equal(record?.migration.sourcePageId, "page.Page5");
  assert.ok(record && Object.keys(record.templeInformation).length > 0);
  assert.ok(record?.sthalaPuranam);
  assert.ok(record?.azhwarPasuram);
  assert.ok(record && record.resources.length > 0);
  assert.ok(record && record.shrines.length > 0 && record.shrines[0].mapsLink.startsWith("http"));
  assert.ok(record && record.images.length > 0);
});

// ---------------------------------------------------------------------------
// E. Tirukoodal (Page93) -- draft/review, no fabricated Maps link.
// ---------------------------------------------------------------------------

test("E: Tirukoodal is draft + needsReview and has no shrines (so no fabricated Maps link can render)", () => {
  const record = loadDivyaDesam("tirukoodal");
  assert.ok(record, "tirukoodal not found via loadDivyaDesam()");
  assert.equal(record?.migration.sourcePageId, "page.Page93");
  assert.equal(record?.status, "draft");
  assert.equal(record?.migration.needsReview, true);
  assert.deepEqual(record?.shrines, []);
});

// ---------------------------------------------------------------------------
// F. A multi-shrine record renders without fabricated templeInformation.
// ---------------------------------------------------------------------------

test("F: a multi-shrine record (Page24) has empty templeInformation but real shrines/images/resources", () => {
  const record = loadDivyaDesam("tanjai-mamanikoyil");
  assert.ok(record, "tanjai-mamanikoyil not found via loadDivyaDesam()");
  assert.equal(record?.migration.sourcePageId, "page.Page24");
  assert.deepEqual(record?.templeInformation, {});
  assert.equal(record?.migration.needsReview, true);
  assert.ok(record && record.shrines.length > 0);
});

// ---------------------------------------------------------------------------
// G. Page150 is not exposed by Divya Desam routes/loader calls.
// ---------------------------------------------------------------------------

test("G: Page150 is not returned by loadDivyaDesams() or reachable via loadDivyaDesam()", () => {
  const all = loadDivyaDesams();
  assert.equal(all.some((r) => r.migration.sourcePageId === "page.Page150"), false);
  // No public slug is known for it (it was never assigned one -- it's a
  // HeldBackRecord, not a DivyaDesam), so there is no slug that could
  // expose it through loadDivyaDesam() in the first place.
});

test("G: no application file creates a route or reference for content/_unresolved/", () => {
  const appFiles = listFilesRecursive(path.join(REPO_ROOT, "app"));
  const componentFiles = listFilesRecursive(path.join(REPO_ROOT, "components"));
  for (const file of [...appFiles, ...componentFiles]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(!source.includes("_unresolved"), `${file} references content/_unresolved/`);
    assert.ok(!source.includes("Page150"), `${file} references Page150`);
  }
});

// ---------------------------------------------------------------------------
// H. Unknown slug resolves to null (the page turns this into notFound()).
// ---------------------------------------------------------------------------

test("H: loadDivyaDesam() returns null for an unknown slug", () => {
  assert.equal(loadDivyaDesam("does-not-exist"), null);
});

test("H: loadDivyaDesam() returns null (not a crash) for a path-traversal-shaped slug", () => {
  assert.equal(loadDivyaDesam("../../etc/passwd"), null);
});

// ---------------------------------------------------------------------------
// Ordinary high-confidence record with multiple resources/images -- real
// data check independent of Sri Rangam/Tirukoodal/the multi-shrine case.
// ---------------------------------------------------------------------------

test("an ordinary high-confidence Divya Desam (Page5's neighbor set) has multiple resources and images available to render", () => {
  const all = loadDivyaDesams();
  const ordinary = all.find(
    (r) =>
      r.migration.extractionConfidence === "high" &&
      r.resources.length > 1 &&
      r.images.length > 0 &&
      Object.keys(r.templeInformation).length > 0
  );
  assert.ok(ordinary, "expected at least one ordinary record with multiple resources + images + temple information");
});

// ---------------------------------------------------------------------------
// Regression: loader counts unchanged by this phase.
// ---------------------------------------------------------------------------

test("loader regression: loadDivyaDesams() still returns exactly 107 records", () => {
  assert.equal(loadDivyaDesams().length, 107);
});

// ---------------------------------------------------------------------------
// Image route handler: path-safety and file-resolution logic.
// ---------------------------------------------------------------------------

test("image resolution validates the uuid shape before touching the filesystem", () => {
  // The Phase 5K/5O route handler (app/images/[uuid]/route.ts) was
  // removed by the GitHub Pages migration: a static host has no runtime
  // to execute it, so images/ moved to public/images/ and is served
  // directly. The UUID-shape check this test exists to guard did not go
  // anywhere -- it still gates every lookup in lib/image-file.ts, which
  // now runs at build time via resolveImageHref (see
  // components/shared/RecordImages.tsx) instead of per request.
  const libSource = read("lib/image-file.ts");
  assert.ok(/UUID_PATTERN/.test(libSource), "expected a UUID shape check");
  assert.match(
    libSource,
    /if \(!UUID_PATTERN\.test\(uuid\)\) return null;/,
    "the UUID shape must be validated before any filesystem access"
  );
  assert.ok(!/from\s+["'].*image-map\.json["']/.test(libSource), "image resolution must not import image-map.json");
  assert.ok(!/readFileSync\(.*image-map/.test(libSource), "image resolution must not read image-map.json directly");
});
