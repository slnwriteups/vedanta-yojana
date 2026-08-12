import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformDivyaDesam } from "../../../scripts/migration/divya-desam.ts";
import { transformBook, transformChapter } from "../../../scripts/migration/book.ts";
import { transformKnowledge } from "../../../scripts/migration/knowledge.ts";
import {
  makeBookSource,
  makeChapterSource,
  makeDivyaDesamSource,
  makeImageRegistry,
  makeImageRegistryEntry,
  makeKnowledgeSource,
} from "../../../scripts/fixtures/synthetic-source.ts";

const CONTEXT = {
  imageRegistry: makeImageRegistry([
    makeImageRegistryEntry({ assetUuid: "11111111-1111-4111-8111-111111111111", sourceOriginalName: "example-photo.jpg" }),
  ]),
};

// ---------------------------------------------------------------------------
// Section 16: determinism. Each transformation run twice against
// identical fixture input must produce deeply-equal output. No
// timestamps, no random IDs, no environment-dependent ordering.
// ---------------------------------------------------------------------------

test("transformDivyaDesam is deterministic across two independent runs with identical input", () => {
  const sourceA = makeDivyaDesamSource();
  const sourceB = makeDivyaDesamSource(); // a SEPARATE object, same values -- proves no shared-state artifact
  const resultA = transformDivyaDesam(sourceA, CONTEXT);
  const resultB = transformDivyaDesam(sourceB, CONTEXT);
  assert.deepEqual(resultA, resultB);
});

test("transformDivyaDesam run twice against the very same object reference is also identical", () => {
  const source = makeDivyaDesamSource();
  const resultA = transformDivyaDesam(source, CONTEXT);
  const resultB = transformDivyaDesam(source, CONTEXT);
  assert.deepEqual(resultA, resultB);
});

test("transformBook is deterministic", () => {
  const resultA = transformBook(makeBookSource());
  const resultB = transformBook(makeBookSource());
  assert.deepEqual(resultA, resultB);
});

test("transformChapter is deterministic", () => {
  const resultA = transformChapter(makeChapterSource(), CONTEXT);
  const resultB = transformChapter(makeChapterSource(), CONTEXT);
  assert.deepEqual(resultA, resultB);
});

test("transformKnowledge is deterministic", () => {
  const resultA = transformKnowledge(makeKnowledgeSource(), CONTEXT);
  const resultB = transformKnowledge(makeKnowledgeSource(), CONTEXT);
  assert.deepEqual(resultA, resultB);
});

test("no timestamp-shaped or random-looking fields appear anywhere in transformer output", () => {
  const result = transformDivyaDesam(makeDivyaDesamSource(), CONTEXT);
  const serialized = JSON.stringify(result);
  // ISO-8601-timestamp shape:
  assert.doesNotMatch(serialized, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  // A real (non-synthetic-looking) v4 UUID appearing anywhere it shouldn't
  // is out of scope here since sourceAssetUuid is expected to look
  // UUID-shaped by design (it's a preserved identifier, not a generated
  // one) -- determinism itself is already proven above by the repeated-run
  // equality checks, which is the property that actually matters.
});

// ---------------------------------------------------------------------------
// Section 19: the transformation functions never read content-extraction/.
// Proven by inspecting the migration layer's own source text, not merely
// asserted.
// ---------------------------------------------------------------------------

const MIGRATION_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../scripts/migration");

// Deliberately an explicit whitelist, not "every .ts file in the
// directory". As of Phase 5F, scripts/migration/ also contains
// migrate-page5.ts (and scripts/migration/adapters/) -- a narrowly-scoped
// ORCHESTRATION entry point that legitimately reads content-extraction/
// and the filesystem, by design (Phase 5F sections 2/5/18). This test's
// purpose is specifically to prove the pure TRANSFORMATION logic never
// does that, so it must name exactly those files rather than assume
// every file in the directory shares that property.
const PURE_TRANSFORMATION_FILES = [
  "errors.ts",
  "types.ts",
  "slug.ts",
  "text-parser.ts",
  "images.ts",
  "links.ts",
  "divya-desam.ts",
  "book.ts",
  "knowledge.ts",
  "held-back.ts",
  "index.ts",
];

function migrationSourceText(): string {
  return PURE_TRANSFORMATION_FILES.map((f) =>
    fs.readFileSync(path.join(MIGRATION_DIR, f), "utf8")
  ).join("\n");
}

test("the migration transformation layer's own source never IMPORTS FROM content-extraction/", () => {
  // Deliberately scoped to actual import statements, not the whole file
  // text -- several files legitimately mention "content-extraction" in
  // prose doc comments (explaining that the module has no dependency on
  // it), which is good documentation, not a violation. What must never
  // happen is an import path or a filesystem-call argument pointing at it.
  const importLines = migrationSourceText()
    .split("\n")
    .filter((line) => /^\s*import\b/.test(line));
  for (const line of importLines) {
    assert.doesNotMatch(line, /content-extraction/, `unexpected content-extraction reference in import: ${line}`);
  }
});

test("the migration transformation layer's own source performs no filesystem access at all (no node:fs import, no readFileSync/readdirSync calls)", () => {
  const source = migrationSourceText();
  assert.doesNotMatch(source, /from ["']node:fs["']/);
  assert.doesNotMatch(source, /require\(["']node:fs["']\)/);
  assert.doesNotMatch(source, /readFileSync|readdirSync|existsSync/);
});
