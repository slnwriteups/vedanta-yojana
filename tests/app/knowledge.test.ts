import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadKnowledge, loadKnowledgeRecord } from "../../content-lib/loader/index.ts";

/**
 * Tests for the Knowledge presentation layer. The one real Knowledge
 * record ("Introduction") is presented at a single static route,
 * app/divya-desams/introduction/page.tsx -- co-located with, and playing
 * the same role as, the Divya Desam detail pages -- rather than at a
 * separate index+detail pair under a generic /knowledge section (that
 * section was retired; see app/divya-desams/page.tsx's introduction link
 * and lib/sitemap.ts).
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KNOWLEDGE_JSON_PATH = path.join(REPO_ROOT, "content/knowledge/introduction.json");
const INTRODUCTION_PAGE = "app/divya-desams/introduction/page.tsx";

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

function readJson(absPath: string): any {
  return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

// ---------------------------------------------------------------------------
// loadKnowledge() / loadKnowledgeRecord() -- unchanged loader behavior.
// ---------------------------------------------------------------------------

test("20: Introduction appears in the real loadKnowledge() result", () => {
  const records = loadKnowledge();
  assert.equal(records.length, 1);
  assert.equal(records[0].title, "Introduction");
  assert.equal(records[0].slug, "introduction");
  assert.equal(records[0].migration.sourcePageId, "page.Page4");
  assert.equal(records[0].status, "draft");
});

// ---------------------------------------------------------------------------
// The introduction page.
// ---------------------------------------------------------------------------

test("the introduction page resolves through loadKnowledgeRecord()", () => {
  const source = read(INTRODUCTION_PAGE);
  assert.ok(source.includes("loadKnowledgeRecord"));
  assert.ok(source.includes("@/content-lib/loader"));
});

test("the introduction page calls notFound() when the record is missing", () => {
  const source = read(INTRODUCTION_PAGE);
  assert.ok(source.includes("notFound()"));
  assert.equal(loadKnowledgeRecord("does-not-exist"), null);
});

test("no application file hard-codes the Knowledge record's title or slug", () => {
  const pageSource = read(INTRODUCTION_PAGE);
  const relatedLinksSource = read("components/knowledge/RelatedContentLinks.tsx");
  for (const source of [pageSource, relatedLinksSource]) {
    assert.ok(!source.includes('"Introduction"'), "found the record title hard-coded in application source");
  }
});

test("24: Introduction's title and body are byte-identical between the loader and the stored JSON", () => {
  const stored = readJson(KNOWLEDGE_JSON_PATH);
  const loaded = loadKnowledgeRecord("introduction");
  assert.ok(loaded);
  assert.equal(loaded?.title, stored.title);
  assert.equal(loaded?.body, stored.body);
});

test("25: no migration metadata appears in the introduction page's application source", () => {
  const files = [INTRODUCTION_PAGE, "components/knowledge/RelatedContentLinks.tsx"];
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

test("RelatedContentLinks resolves a knowledge-type reference to its new /divya-desams/ location", () => {
  const source = read("components/knowledge/RelatedContentLinks.tsx");
  assert.match(source, /case "knowledge":[\s\S]*?\/divya-desams\/\$\{record\.slug\}/);
});

test("the real Introduction record has an empty relatedContent array (nothing to fabricate around today)", () => {
  const record = loadKnowledgeRecord("introduction");
  assert.deepEqual(record?.relatedContent, []);
});
