import test from "node:test";
import assert from "node:assert/strict";
import { KnowledgeSchema } from "../../content-lib/schemas/index.ts";
import { makeKnowledgeInput } from "./fixtures/index.ts";

test("a minimal valid Knowledge record parses", () => {
  const result = KnowledgeSchema.safeParse(makeKnowledgeInput());
  assert.equal(result.success, true);
});

test("Q: Knowledge status defaults to draft", () => {
  const parsed = KnowledgeSchema.parse(makeKnowledgeInput());
  assert.equal(parsed.status, "draft");
});

test("T: an empty Knowledge body fails", () => {
  const result = KnowledgeSchema.safeParse(makeKnowledgeInput({ body: "" }));
  assert.equal(result.success, false);
});

test("contentType is extensible -- any non-empty string is accepted, not a closed enum", () => {
  for (const contentType of [
    "educational",
    "philosophy",
    "biography",
    "itihasa",
    "purana",
    "stotram",
    "article",
    "some-future-category-not-yet-invented",
  ]) {
    const result = KnowledgeSchema.safeParse(makeKnowledgeInput({ contentType }));
    assert.equal(result.success, true, `expected contentType "${contentType}" to be accepted`);
  }
});

test("contentType is still required and cannot be empty", () => {
  const result = KnowledgeSchema.safeParse(makeKnowledgeInput({ contentType: "" }));
  assert.equal(result.success, false);
});

test("Knowledge relatedContent defaults to an empty array", () => {
  const parsed = KnowledgeSchema.parse(makeKnowledgeInput());
  assert.deepEqual(parsed.relatedContent, []);
});

test("Knowledge images defaults to an empty array", () => {
  const parsed = KnowledgeSchema.parse(makeKnowledgeInput());
  assert.deepEqual(parsed.images, []);
});
