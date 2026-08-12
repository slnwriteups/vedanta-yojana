import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createContentLoader } from "../../content-lib/loader/index.ts";
import { makeFullDivyaDesamInput } from "./fixtures/index.ts";
import { cleanupTempContentRoot, makeTempContentRoot, writeJsonFile } from "./fixtures/temp-content-root.ts";

const LOADER_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../content-lib/loader"
);

function loaderSourceText(): string {
  return fs
    .readdirSync(LOADER_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => fs.readFileSync(path.join(LOADER_DIR, f), "utf8"))
    .join("\n");
}

// ---------------------------------------------------------------------------
// T. Loader does not read from content-extraction/.
// ---------------------------------------------------------------------------

test("T: the loader's own source never references content-extraction/", () => {
  const source = loaderSourceText();
  assert.doesNotMatch(source, /content-extraction/);
});

test("T: loading from an isolated temp root never returns anything -- there is no implicit fallback to the real content-extraction/ or /content", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));
  const loader = createContentLoader(root);
  // If the loader somehow fell back to reading the real repository's
  // content-extraction/ or /content directories, these would be
  // non-empty/non-null. They are not, because the loader only ever reads
  // from the exact contentRoot it was constructed with.
  assert.deepEqual(loader.loadDivyaDesams(), []);
  assert.deepEqual(loader.loadBooks(), []);
  assert.deepEqual(loader.loadKnowledge(), []);
});

// ---------------------------------------------------------------------------
// U. Loader does not require any external service.
// ---------------------------------------------------------------------------

test("U: the loader's own source contains no network/HTTP/database calls", () => {
  const source = loaderSourceText();
  for (const forbidden of ["fetch(", "http://", "https://", "XMLHttpRequest", "axios", "node:http", "node:https", "mongodb", "postgres", "mysql"]) {
    assert.doesNotMatch(
      source,
      new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `loader source unexpectedly references "${forbidden}"`
    );
  }
});

test("U: loader functions are synchronous (no network round-trip is possible)", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));
  writeJsonFile(path.join(root, "divya-desams", "example-temple.json"), makeFullDivyaDesamInput());

  const loader = createContentLoader(root);
  assert.equal(loader.loadDivyaDesams() instanceof Promise, false);
  assert.equal(loader.loadDivyaDesam("example-temple") instanceof Promise, false);
  assert.equal(loader.loadBooks() instanceof Promise, false);
  assert.equal(loader.loadKnowledge() instanceof Promise, false);
});

// ---------------------------------------------------------------------------
// General sanity: an entirely empty content root (not even the top-level
// subdirectories present) behaves cleanly across every loader function at once.
// ---------------------------------------------------------------------------

test("a totally empty content root behaves cleanly across the whole public API", (t) => {
  const root = makeTempContentRoot();
  t.after(() => cleanupTempContentRoot(root));
  const loader = createContentLoader(root);

  assert.deepEqual(loader.loadDivyaDesams(), []);
  assert.equal(loader.loadDivyaDesam("anything"), null);
  assert.deepEqual(loader.loadBooks(), []);
  assert.equal(loader.loadBook("anything"), null);
  assert.deepEqual(loader.loadChapters("anything"), []);
  assert.equal(loader.loadChapter("anything", "anything"), null);
  assert.deepEqual(loader.loadKnowledge(), []);
  assert.equal(loader.loadKnowledgeRecord("anything"), null);
});
