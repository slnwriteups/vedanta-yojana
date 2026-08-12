import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createContentLoader } from "../../content-lib/loader/index.ts";
import { DuplicateSlugError } from "../../content-lib/loader/errors.ts";
import { makeKnowledgeInput } from "./fixtures/index.ts";
import { cleanupTempContentRoot, makeTempContentRoot, writeJsonFile } from "./fixtures/temp-content-root.ts";

// ---------------------------------------------------------------------------
// C. Empty content repository returns [] for Knowledge.
// ---------------------------------------------------------------------------

test("C: loadKnowledge() returns [] for an empty content root", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));
  const loader = createContentLoader(root);
  assert.deepEqual(loader.loadKnowledge(), []);
});

test("loadKnowledgeRecord() returns null for a slug that doesn't exist", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));
  const loader = createContentLoader(root);
  assert.equal(loader.loadKnowledgeRecord("no-such-record"), null);
});

test("a valid synthetic Knowledge record loads, contentType is not restricted to a fixed enum", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  writeJsonFile(
    path.join(root, "knowledge", "example-item.json"),
    makeKnowledgeInput({ contentType: "some-future-category" })
  );

  const loader = createContentLoader(root);
  const all = loader.loadKnowledge();
  assert.equal(all.length, 1);
  assert.equal(all[0].contentType, "some-future-category");

  const single = loader.loadKnowledgeRecord("example-knowledge-item");
  assert.notEqual(single, null);
});

test("duplicate Knowledge slugs across two files throw DuplicateSlugError", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));

  writeJsonFile(
    path.join(root, "knowledge", "a.json"),
    makeKnowledgeInput({ slug: "example-knowledge-item" })
  );
  writeJsonFile(
    path.join(root, "knowledge", "b.json"),
    makeKnowledgeInput({ slug: "example-knowledge-item" })
  );

  const loader = createContentLoader(root);
  assert.throws(() => loader.loadKnowledge(), DuplicateSlugError);
});
