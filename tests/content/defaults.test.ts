import test from "node:test";
import assert from "node:assert/strict";
import {
  BookSchema,
  ChapterSchema,
  DivyaDesamSchema,
  KnowledgeSchema,
} from "../../content-lib/schemas/index.ts";
import {
  makeBookInput,
  makeChapterInput,
  makeDivyaDesamInput,
  makeKnowledgeInput,
} from "./fixtures/index.ts";

/**
 * Phase 5C, Section 15 — "Default safety" — every one of these assertions
 * is required explicitly. This file exists specifically to make each one
 * individually checkable, rather than relying on it being an incidental
 * side-effect of another test elsewhere.
 */

test("omitted status becomes draft (Divya Desam)", () => {
  assert.equal(DivyaDesamSchema.parse(makeDivyaDesamInput()).status, "draft");
});

test("omitted status becomes draft (Book)", () => {
  assert.equal(BookSchema.parse(makeBookInput()).status, "draft");
});

test("omitted status becomes draft (Chapter)", () => {
  assert.equal(ChapterSchema.parse(makeChapterInput()).status, "draft");
});

test("omitted status becomes draft (Knowledge)", () => {
  assert.equal(KnowledgeSchema.parse(makeKnowledgeInput()).status, "draft");
});

test("omitted image altStatus becomes needs-review", () => {
  const parsed = DivyaDesamSchema.parse(
    makeDivyaDesamInput({
      images: [
        {
          assetId: "example-image-default-check",
          sourceAssetUuid: "00000000-0000-4000-8000-000000000099",
          sourceOriginalName: "example.jpg",
          alt: null,
          // altStatus intentionally omitted
        },
      ],
    })
  );
  assert.equal(parsed.images[0].altStatus, "needs-review");
});

test("omitted images becomes [] (Divya Desam)", () => {
  assert.deepEqual(DivyaDesamSchema.parse(makeDivyaDesamInput()).images, []);
});

test("omitted images becomes [] (Chapter)", () => {
  assert.deepEqual(ChapterSchema.parse(makeChapterInput()).images, []);
});

test("omitted images becomes [] (Knowledge)", () => {
  assert.deepEqual(KnowledgeSchema.parse(makeKnowledgeInput()).images, []);
});

test("omitted shrines becomes []", () => {
  assert.deepEqual(DivyaDesamSchema.parse(makeDivyaDesamInput()).shrines, []);
});

test("omitted resources becomes []", () => {
  assert.deepEqual(DivyaDesamSchema.parse(makeDivyaDesamInput()).resources, []);
});

test("omitted relatedContent becomes [] (Divya Desam)", () => {
  assert.deepEqual(DivyaDesamSchema.parse(makeDivyaDesamInput()).relatedContent, []);
});

test("omitted relatedContent becomes [] (Knowledge)", () => {
  assert.deepEqual(KnowledgeSchema.parse(makeKnowledgeInput()).relatedContent, []);
});

test("omitted book parts becomes []", () => {
  assert.deepEqual(BookSchema.parse(makeBookInput()).parts, []);
});

test("omitted book chapterOrder becomes []", () => {
  assert.deepEqual(BookSchema.parse(makeBookInput()).chapterOrder, []);
});

// ---------------------------------------------------------------------------
// Z. No schema has a published default. Checked directly across all four
// content schemas, each parsed with `status` entirely omitted.
// ---------------------------------------------------------------------------

test("Z: no content schema defaults status to published", () => {
  const divyaDesam = DivyaDesamSchema.parse(makeDivyaDesamInput());
  const book = BookSchema.parse(makeBookInput());
  const chapter = ChapterSchema.parse(makeChapterInput());
  const knowledge = KnowledgeSchema.parse(makeKnowledgeInput());

  for (const [name, record] of [
    ["DivyaDesam", divyaDesam],
    ["Book", book],
    ["Chapter", chapter],
    ["Knowledge", knowledge],
  ] as const) {
    assert.equal(record.status, "draft", `expected ${name} default status to be "draft"`);
    assert.notEqual(record.status, "published", `${name} must never default to "published"`);
  }
});
