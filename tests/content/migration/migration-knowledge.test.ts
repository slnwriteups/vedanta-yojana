import test from "node:test";
import assert from "node:assert/strict";
import { transformKnowledge } from "../../../scripts/migration/knowledge.ts";
import { KnowledgeSchema } from "../../../content-lib/schemas/index.ts";
import {
  makeImageRegistry,
  makeImageRegistryEntry,
  makeKnowledgeSource,
  makeTextBlock,
} from "../../../scripts/fixtures/synthetic-source.ts";

const CONTEXT = {
  imageRegistry: makeImageRegistry([
    makeImageRegistryEntry({ assetUuid: "55555555-5555-4555-8555-555555555555", sourceOriginalName: "example-knowledge-image.jpg" }),
  ]),
};

test("title preservation", () => {
  const record = transformKnowledge(makeKnowledgeSource({ title: "Example Knowledge — Ṭest" }), CONTEXT);
  assert.equal(record.title, "Example Knowledge — Ṭest");
});

test("slug generation follows the shared rules", () => {
  const record = transformKnowledge(makeKnowledgeSource({ title: "108) Example Topic" }), CONTEXT);
  assert.equal(record.slug, "example-topic");
});

test("contentType is preserved exactly, including values outside any fixed enum", () => {
  const record = transformKnowledge(makeKnowledgeSource({ contentType: "some-future-category" }), CONTEXT);
  assert.equal(record.contentType, "some-future-category");
});

test("a single-text-block body is preserved verbatim", () => {
  const distinctiveBody = "A distinctive synthetic knowledge body, EXACT-MATCH-TOKEN-77410.";
  const record = transformKnowledge(
    makeKnowledgeSource({ contentBlocks: [makeTextBlock(distinctiveBody)] }),
    CONTEXT
  );
  assert.equal(record.body, distinctiveBody);
});

test("migration.sourcePageId is preserved", () => {
  const record = transformKnowledge(makeKnowledgeSource({ pageId: "page.TestKnowledgeExample" }), CONTEXT);
  assert.equal(record.migration.sourcePageId, "page.TestKnowledgeExample");
});

test("draft status regardless of confidence", () => {
  const high = transformKnowledge(makeKnowledgeSource({ classification: { category: "non_temple_content_candidate", confidence: "high" } }), CONTEXT);
  const low = transformKnowledge(makeKnowledgeSource({ classification: { category: "unresolved_possible_divya_desam", confidence: "low" } }), CONTEXT);
  assert.equal(high.status, "draft");
  assert.equal(low.status, "draft");
});

test("images transform where applicable, and default to [] where not", () => {
  const withImage = transformKnowledge(
    makeKnowledgeSource({ imageAssetRefs: ["55555555-5555-4555-8555-555555555555"] }),
    CONTEXT
  );
  assert.equal(withImage.images.length, 1);
  assert.equal(withImage.images[0].sourceAssetUuid, "55555555-5555-4555-8555-555555555555");

  const withoutImage = transformKnowledge(makeKnowledgeSource({ imageAssetRefs: [] }), CONTEXT);
  assert.deepEqual(withoutImage.images, []);
});

test("relatedContent defaults to [] -- never fabricated", () => {
  const record = transformKnowledge(makeKnowledgeSource(), CONTEXT);
  assert.deepEqual(record.relatedContent, []);
});

test("Knowledge output independently passes KnowledgeSchema", () => {
  const result = KnowledgeSchema.safeParse(transformKnowledge(makeKnowledgeSource(), CONTEXT));
  assert.equal(result.success, true);
});
