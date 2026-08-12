import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createContentLoader } from "../../content-lib/loader/index.ts";
import { DuplicateSlugError, ContentValidationError, MalformedJsonError } from "../../content-lib/loader/errors.ts";
import { makeFullDivyaDesamInput } from "./fixtures/index.ts";
import {
  cleanupTempContentRoot,
  makeTempContentRoot,
  writeJsonFile,
  writeRawFile,
} from "./fixtures/temp-content-root.ts";

// ---------------------------------------------------------------------------
// A. Empty content repository returns [] for Divya Desams.
// ---------------------------------------------------------------------------

test("A: loadDivyaDesams() returns [] for an empty content root", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  const loader = createContentLoader(root);
  assert.deepEqual(loader.loadDivyaDesams(), []);
});

test("A: loadDivyaDesams() returns [] when the divya-desams/ directory doesn't exist at all", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));
  // Deliberately not creating content/divya-desams/ -- proves a missing
  // directory is treated the same as an empty one, not an error.
  const loader = createContentLoader(root);
  assert.deepEqual(loader.loadDivyaDesams(), []);
});

// ---------------------------------------------------------------------------
// D. Missing Divya Desam returns the documented not-found value.
// ---------------------------------------------------------------------------

test("D: loadDivyaDesam() returns null for a slug that doesn't exist", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  const loader = createContentLoader(root);
  assert.equal(loader.loadDivyaDesam("no-such-temple"), null);
});

// ---------------------------------------------------------------------------
// G. A valid synthetic Divya Desam file loads and is returned as a typed object.
// ---------------------------------------------------------------------------

test("G: a valid synthetic Divya Desam file loads as a typed object", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  writeJsonFile(
    path.join(root, "divya-desams", "example-temple.json"),
    makeFullDivyaDesamInput()
  );

  const loader = createContentLoader(root);
  const all = loader.loadDivyaDesams();
  assert.equal(all.length, 1);
  assert.equal(all[0].slug, "example-temple");
  assert.equal(all[0].displayName, "Example Temple");
  assert.equal(all[0].templeInformation.moolavar, "Example Moolavar");

  const single = loader.loadDivyaDesam("example-temple");
  assert.notEqual(single, null);
  assert.equal(single?.slug, "example-temple");
});

// ---------------------------------------------------------------------------
// V. Returned objects are schema-validated (proven via applied defaults,
//    not merely proving JSON.parse succeeded).
// ---------------------------------------------------------------------------

test("V: returned records reflect Zod-applied defaults, proving they were schema-validated", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  // Deliberately minimal raw JSON: no status, no shrines, no images, no
  // resources, no relatedContent, no templeInformation keys at all.
  writeJsonFile(path.join(root, "divya-desams", "minimal.json"), {
    slug: "minimal-example",
    displayName: "Minimal Example",
    migration: { sourcePageId: "test-source-page-1", extractionConfidence: "high", needsReview: false },
  });

  const loader = createContentLoader(root);
  const record = loader.loadDivyaDesam("minimal-example");
  assert.notEqual(record, null);
  // These values only exist because DivyaDesamSchema.parse() applied its
  // defaults -- plain JSON.parse() of the raw file would leave them absent.
  assert.equal(record?.status, "draft");
  assert.deepEqual(record?.shrines, []);
  assert.deepEqual(record?.images, []);
  assert.deepEqual(record?.resources, []);
  assert.deepEqual(record?.relatedContent, []);
  assert.deepEqual(record?.templeInformation, {});
});

// ---------------------------------------------------------------------------
// K. Duplicate Divya Desam slugs fail.
// ---------------------------------------------------------------------------

test("K: duplicate Divya Desam slugs across two files throw DuplicateSlugError", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  writeJsonFile(
    path.join(root, "divya-desams", "a.json"),
    makeFullDivyaDesamInput({ slug: "example-temple" })
  );
  writeJsonFile(
    path.join(root, "divya-desams", "b.json"),
    makeFullDivyaDesamInput({ slug: "example-temple" })
  );

  const loader = createContentLoader(root);
  assert.throws(() => loader.loadDivyaDesams(), DuplicateSlugError);
});

// ---------------------------------------------------------------------------
// O. Malformed JSON fails with a useful file-identifying error.
// ---------------------------------------------------------------------------

test("O: malformed JSON fails with an error identifying the file", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  const badFile = path.join(root, "divya-desams", "broken.json");
  writeRawFile(badFile, "{ this is not valid JSON ");

  const loader = createContentLoader(root);
  assert.throws(() => loader.loadDivyaDesams(), (err: unknown) => {
    assert.ok(err instanceof MalformedJsonError);
    assert.equal(err.filePath, badFile);
    assert.match(err.message, /broken\.json/);
    return true;
  });
});

// ---------------------------------------------------------------------------
// P. Schema-invalid JSON fails with a useful validation error.
// ---------------------------------------------------------------------------

test("P: schema-invalid JSON fails with a validation error identifying the file", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  const invalidFile = path.join(root, "divya-desams", "invalid.json");
  // Missing required `displayName` and `migration`; slug is also badly shaped.
  writeJsonFile(invalidFile, { slug: "Not A Valid Slug" });

  const loader = createContentLoader(root);
  assert.throws(() => loader.loadDivyaDesams(), (err: unknown) => {
    assert.ok(err instanceof ContentValidationError);
    assert.equal(err.filePath, invalidFile);
    assert.equal(err.contentType, "Divya Desam");
    assert.match(err.message, /invalid\.json/);
    return true;
  });
});

// ---------------------------------------------------------------------------
// Q. Unrelated files such as README.md are ignored.
// ---------------------------------------------------------------------------

test("Q: non-.json files (e.g. README.md) are ignored, not treated as content", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  writeJsonFile(
    path.join(root, "divya-desams", "example-temple.json"),
    makeFullDivyaDesamInput()
  );
  writeRawFile(
    path.join(root, "divya-desams", "README.md"),
    "# Not a content file\nThis should be ignored by the loader."
  );

  const loader = createContentLoader(root);
  const all = loader.loadDivyaDesams();
  assert.equal(all.length, 1);
  assert.equal(all[0].slug, "example-temple");
});

// ---------------------------------------------------------------------------
// R. Lookup uses slug rather than displayName.
// ---------------------------------------------------------------------------

test("R: lookup resolves by validated slug, never by displayName", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  writeJsonFile(
    path.join(root, "divya-desams", "example-temple.json"),
    makeFullDivyaDesamInput({ slug: "example-temple", displayName: "A Totally Different Display Name" })
  );

  const loader = createContentLoader(root);
  assert.equal(loader.loadDivyaDesam("example-temple")?.displayName, "A Totally Different Display Name");
  // Looking up by the displayName text must NOT resolve anything.
  assert.equal(loader.loadDivyaDesam("A Totally Different Display Name"), null);
  assert.equal(loader.loadDivyaDesam("a-totally-different-display-name"), null);
});

// ---------------------------------------------------------------------------
// S. Directory traversal attempts cannot escape the content root.
// ---------------------------------------------------------------------------

test("S: a directory-traversal-shaped slug never touches the filesystem and returns null", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  writeJsonFile(
    path.join(root, "divya-desams", "example-temple.json"),
    makeFullDivyaDesamInput()
  );

  const loader = createContentLoader(root);

  for (const maliciousSlug of [
    "../../../etc/passwd",
    "../secret",
    "..",
    "/etc/passwd",
    "..%2f..%2fetc%2fpasswd",
  ]) {
    assert.equal(
      loader.loadDivyaDesam(maliciousSlug),
      null,
      `expected "${maliciousSlug}" to resolve to null, not throw or leak filesystem access`
    );
  }
});
