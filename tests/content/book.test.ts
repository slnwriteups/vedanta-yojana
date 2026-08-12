import test from "node:test";
import assert from "node:assert/strict";
import { BookSchema } from "../../content-lib/schemas/index.ts";
import { makeBookInput } from "./fixtures/index.ts";

test("a minimal valid Book parses", () => {
  const result = BookSchema.safeParse(makeBookInput());
  assert.equal(result.success, true);
});

test("O: Book status defaults to draft", () => {
  const parsed = BookSchema.parse(makeBookInput());
  assert.equal(parsed.status, "draft");
});

test("Book may exist with author, description, and coverImage all absent", () => {
  const parsed = BookSchema.parse(makeBookInput());
  assert.equal(parsed.author, undefined);
  assert.equal(parsed.description, undefined);
  assert.equal(parsed.coverImage, undefined);
  // The recovered book's title/author is an open editorial decision
  // (Phase 5A) -- this proves the schema never requires author to exist.
});

test("Book title is required", () => {
  const result = BookSchema.safeParse({
    slug: "example-book",
    migration: { sourcePageId: "test-1", extractionConfidence: "high", needsReview: false },
  });
  assert.equal(result.success, false);
});

test("Book parts defaults to an empty array", () => {
  const parsed = BookSchema.parse(makeBookInput());
  assert.deepEqual(parsed.parts, []);
});

test("Book chapterOrder defaults to an empty array", () => {
  const parsed = BookSchema.parse(makeBookInput());
  assert.deepEqual(parsed.chapterOrder, []);
});

test("Book chapterOrder accepts an explicit ordered list of chapter slugs", () => {
  const parsed = BookSchema.parse(
    makeBookInput({ chapterOrder: ["example-chapter-one", "example-chapter-two"] })
  );
  assert.deepEqual(parsed.chapterOrder, ["example-chapter-one", "example-chapter-two"]);
});
