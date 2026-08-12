import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadKnowledge, loadKnowledgeRecord } from "../../content-lib/loader/index.ts";

/**
 * Phase 5L -- tests for the Knowledge presentation layer. Same approach
 * as tests/app/library.test.ts and tests/app/divya-desams.test.ts.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KNOWLEDGE_JSON_PATH = path.join(REPO_ROOT, "content/knowledge/introduction.json");

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

function readJson(absPath: string): any {
  return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

// ---------------------------------------------------------------------------
// 19-21. KNOWLEDGE index.
// ---------------------------------------------------------------------------

test("19: the Knowledge index page imports and calls loadKnowledge()", () => {
  const source = read("app/knowledge/page.tsx");
  assert.ok(source.includes("loadKnowledge"));
  assert.ok(source.includes("@/content-lib/loader"));
});

test("20: Introduction appears in the real loadKnowledge() result", () => {
  const records = loadKnowledge();
  assert.equal(records.length, 1);
  assert.equal(records[0].title, "Introduction");
  assert.equal(records[0].slug, "introduction");
  assert.equal(records[0].migration.sourcePageId, "page.Page4");
  assert.equal(records[0].status, "draft");
});

test("21: the Knowledge index page has a graceful empty-state branch", () => {
  const source = read("app/knowledge/page.tsx");
  assert.ok(source.includes("No records are available yet"));
});

test("no application file hard-codes the Knowledge record's title or slug", () => {
  const indexSource = read("app/knowledge/page.tsx");
  const cardSource = read("components/knowledge/KnowledgeCard.tsx");
  const detailSource = read("app/knowledge/[slug]/page.tsx");
  for (const source of [indexSource, cardSource, detailSource]) {
    assert.ok(!source.includes('"Introduction"'), "found the record title hard-coded in application source");
    assert.ok(!source.includes('"introduction"'), "found the record slug hard-coded in application source");
  }
});

// ---------------------------------------------------------------------------
// 22-25. KNOWLEDGE detail.
// ---------------------------------------------------------------------------

test("22: the Knowledge detail page resolves through loadKnowledgeRecord()", () => {
  const source = read("app/knowledge/[slug]/page.tsx");
  assert.ok(source.includes("loadKnowledgeRecord"));
});

test("23: the Knowledge detail page calls notFound() when the record is missing", () => {
  const source = read("app/knowledge/[slug]/page.tsx");
  assert.ok(source.includes("notFound()"));
  assert.equal(loadKnowledgeRecord("does-not-exist"), null);
});

test("24: Introduction's title and body are byte-identical between the loader and the stored JSON", () => {
  const stored = readJson(KNOWLEDGE_JSON_PATH);
  const loaded = loadKnowledgeRecord("introduction");
  assert.ok(loaded);
  assert.equal(loaded?.title, stored.title);
  assert.equal(loaded?.body, stored.body);
});

test("25: no migration metadata appears in the Knowledge index/detail application source", () => {
  const files = [
    "app/knowledge/page.tsx",
    "app/knowledge/[slug]/page.tsx",
    "components/knowledge/KnowledgeCard.tsx",
    "components/knowledge/RelatedContentLinks.tsx",
  ];
  for (const relPath of files) {
    const source = read(relPath);
    assert.ok(!source.includes("sourcePageId"), `${relPath} references sourcePageId`);
    assert.ok(!source.includes("extractionConfidence"), `${relPath} references extractionConfidence`);
  }
});

// ---------------------------------------------------------------------------
// relatedContent: resolved-or-omitted, never fabricated.
// ---------------------------------------------------------------------------

test("RelatedContentLinks skips unresolvable chapter-type references rather than guessing a book", () => {
  const source = read("components/knowledge/RelatedContentLinks.tsx");
  assert.match(source, /case "chapter":\s*\n\s*return null;/);
});

test("the real Introduction record has an empty relatedContent array (nothing to fabricate around today)", () => {
  const record = loadKnowledgeRecord("introduction");
  assert.deepEqual(record?.relatedContent, []);
});
