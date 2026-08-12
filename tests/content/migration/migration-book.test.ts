import test from "node:test";
import assert from "node:assert/strict";
import { transformBook, transformChapter } from "../../../scripts/migration/book.ts";
import { BookSchema, ChapterSchema } from "../../../content-lib/schemas/index.ts";
import {
  makeBookSource,
  makeChapterSource,
  makeImageRegistry,
  makeImageRegistryEntry,
  makeTextBlock,
} from "../../../scripts/fixtures/synthetic-source.ts";

const CONTEXT = {
  imageRegistry: makeImageRegistry([
    makeImageRegistryEntry({ assetUuid: "44444444-4444-4444-8444-444444444444", sourceOriginalName: "example-chapter-image.jpg" }),
  ]),
};

// ---------------------------------------------------------------------------
// transformBook
// ---------------------------------------------------------------------------

test("title preservation: source.title becomes Book.title verbatim", () => {
  const book = transformBook(makeBookSource({ title: "Example Book Title — Ṭest" }));
  assert.equal(book.title, "Example Book Title — Ṭest");
});

test("slug generation: Book.slug is derived from title via the shared slug function", () => {
  const book = transformBook(makeBookSource({ title: "108) Example Book (Draft)" }));
  assert.equal(book.slug, "example-book-draft");
});

test("draft status: a Book is always status: draft, regardless of confidence", () => {
  const high = transformBook(makeBookSource({ classification: { category: "non_temple_content_candidate", confidence: "high" } }));
  const low = transformBook(makeBookSource({ classification: { category: "unresolved_possible_divya_desam", confidence: "low" } }));
  assert.equal(high.status, "draft");
  assert.equal(low.status, "draft");
});

test("migration.sourcePageId is preserved", () => {
  const book = transformBook(makeBookSource({ pageId: "page.TestBookExample" }));
  assert.equal(book.migration.sourcePageId, "page.TestBookExample");
});

test("no author/description/coverImage is ever invented when the source doesn't supply one", () => {
  const book = transformBook(makeBookSource());
  assert.equal(book.author, undefined);
  assert.equal(book.description, undefined);
  assert.equal(book.coverImage, undefined);
});

test("Book output independently passes BookSchema", () => {
  const result = BookSchema.safeParse(transformBook(makeBookSource()));
  assert.equal(result.success, true);
});

// ---------------------------------------------------------------------------
// transformChapter
// ---------------------------------------------------------------------------

test("chapter title preservation", () => {
  const chapter = transformChapter(makeChapterSource({ title: "Example Chapter — Ṭest" }), CONTEXT);
  assert.equal(chapter.title, "Example Chapter — Ṭest");
});

test("chapter slug generation follows the same shared rules", () => {
  const chapter = transformChapter(makeChapterSource({ title: "12. Example Chapter" }), CONTEXT);
  assert.equal(chapter.slug, "example-chapter");
});

test("chapter order is preserved exactly (deterministic chapter metadata)", () => {
  const chapter = transformChapter(makeChapterSource({ order: 7 }), CONTEXT);
  assert.equal(chapter.order, 7);
});

test("chapter draft status regardless of confidence", () => {
  const chapter = transformChapter(
    makeChapterSource({ classification: { category: "non_temple_content_candidate", confidence: "low" } }),
    CONTEXT
  );
  assert.equal(chapter.status, "draft");
});

test("chapter migration.sourcePageId is preserved", () => {
  const chapter = transformChapter(makeChapterSource({ pageId: "page.TestChapterExample" }), CONTEXT);
  assert.equal(chapter.migration.sourcePageId, "page.TestChapterExample");
});

// Section 15: verbatim content guarantee for a single-text-block chapter body.
test("a single-text-block chapter body is preserved verbatim (exact equality)", () => {
  const distinctiveBody = "A distinctive synthetic chapter body string, EXACT-MATCH-TOKEN-99231.";
  const chapter = transformChapter(
    makeChapterSource({ contentBlocks: [makeTextBlock(distinctiveBody)] }),
    CONTEXT
  );
  assert.equal(chapter.body, distinctiveBody);
});

test("documented mechanical normalization: multiple text blocks are joined with a blank line between them, each block's own text otherwise unmodified", () => {
  const chapter = transformChapter(
    makeChapterSource({
      contentBlocks: [makeTextBlock("First block text."), makeTextBlock("Second block text.")],
    }),
    CONTEXT
  );
  assert.equal(chapter.body, "First block text.\n\nSecond block text.");
});

test("chapter images resolve through the same deterministic image resolution as Divya Desams", () => {
  const chapter = transformChapter(
    makeChapterSource({ imageAssetRefs: ["44444444-4444-4444-8444-444444444444"] }),
    CONTEXT
  );
  assert.equal(chapter.images.length, 1);
  assert.equal(chapter.images[0].sourceAssetUuid, "44444444-4444-4444-8444-444444444444");
  assert.equal(chapter.images[0].altStatus, "needs-review");
});

test("Chapter output independently passes ChapterSchema", () => {
  const result = ChapterSchema.safeParse(transformChapter(makeChapterSource(), CONTEXT));
  assert.equal(result.success, true);
});
