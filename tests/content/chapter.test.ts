import test from "node:test";
import assert from "node:assert/strict";
import { ChapterSchema } from "../../content-lib/schemas/index.ts";
import { makeChapterInput } from "./fixtures/index.ts";

test("a minimal valid Chapter parses", () => {
  const result = ChapterSchema.safeParse(makeChapterInput());
  assert.equal(result.success, true);
});

test("P: Chapter status defaults to draft", () => {
  const parsed = ChapterSchema.parse(makeChapterInput());
  assert.equal(parsed.status, "draft");
});

test("R: chapter order must be an integer (fractional order fails)", () => {
  const result = ChapterSchema.safeParse(makeChapterInput({ order: 1.5 }));
  assert.equal(result.success, false);
});

test("R: a whole-number order passes", () => {
  const result = ChapterSchema.safeParse(makeChapterInput({ order: 12 }));
  assert.equal(result.success, true);
});

test("S: an empty chapter body fails", () => {
  const result = ChapterSchema.safeParse(makeChapterInput({ body: "" }));
  assert.equal(result.success, false);
});

test("S: a missing chapter body fails", () => {
  const result = ChapterSchema.safeParse(makeChapterInput({ body: undefined }));
  assert.equal(result.success, false);
});

test("chapter images defaults to an empty array", () => {
  const parsed = ChapterSchema.parse(makeChapterInput());
  assert.deepEqual(parsed.images, []);
});

test(
  "note: this schema cannot and does not enforce unique `order` across a " +
    "book's chapters -- two independently-valid chapters may share an " +
    "order value; cross-record uniqueness is a Phase 5I concern",
  () => {
    const a = ChapterSchema.safeParse(makeChapterInput({ slug: "example-chapter-a", order: 1 }));
    const b = ChapterSchema.safeParse(makeChapterInput({ slug: "example-chapter-b", order: 1 }));
    assert.equal(a.success, true);
    assert.equal(b.success, true);
  }
);
