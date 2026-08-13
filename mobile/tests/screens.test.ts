import test from "node:test";
import assert from "node:assert/strict";
import { loadBook, loadChapter, loadChapters, loadDivyaDesam, loadDivyaDesams, loadKnowledgeRecord } from "../content-lib/loader.ts";
import { sourcePageNumber } from "../content-lib/ordering.ts";
import { buildMobileSearchCorpus } from "../content-lib/corpus.ts";
import { searchCorpus } from "../../content-lib/search/run.ts";
import { HOME_SECTIONS } from "../content-lib/navigation.ts";

/**
 * Phase 6B, Step 10 -- foundation tests for the screen-level data logic
 * each real screen depends on. Deliberately does NOT import any
 * react-native component (app/*.tsx, components/*.tsx): Node has no
 * react-native/Metro runtime, so those files can only be exercised via
 * `npx expo export` (see the Phase 6B report's validation section), the
 * same boundary Phase 6A's loader.test.ts already established. These
 * tests instead prove the underlying data each screen renders is
 * correct, which is the part that can actually break silently.
 */

const BOOK_SLUG = "untitled-recovered-book-pending-editorial-title";

test("Home: the four navigation sections are well-formed and route to real screens", () => {
  assert.equal(HOME_SECTIONS.length, 4);
  const routes = HOME_SECTIONS.map((s) => s.route).sort();
  assert.deepEqual(routes, ["/divya-desams", "/knowledge", "/library", "/search"]);
});

test("Divya Desams: 107 records available for the index screen", () => {
  assert.equal(loadDivyaDesams().length, 107);
});

test("Divya Desams: Sri Rangam resolves for the detail screen", () => {
  const record = loadDivyaDesam("sri-rangam");
  assert.ok(record, "sri-rangam did not resolve");
  assert.equal(record?.displayName, "Sri Rangam");
});

test("Divya Desams: an unknown slug is handled as not-found, not a crash", () => {
  assert.equal(loadDivyaDesam("does-not-exist"), null);
});

test("Divya Desams: every real record's sourcePageId sorts to a valid numeric order (Page93 included)", () => {
  const records = loadDivyaDesams();
  const numbers = records.map((r) => sourcePageNumber(r.migration.sourcePageId));
  assert.equal(numbers.length, 107);
  assert.ok(numbers.every((n) => Number.isInteger(n) && n > 0));

  const tirukoodal = loadDivyaDesam("tirukoodal");
  assert.equal(sourcePageNumber(tirukoodal!.migration.sourcePageId), 93);
});

test("Library: the recovered Book resolves for the book screen", () => {
  const book = loadBook(BOOK_SLUG);
  assert.ok(book, "the book did not resolve");
  // Phase 6E confirmed "A Brief Insight to Visishtadvaita Philosophy.pdf"
  // as the source for 17 of this book's 55 chapters and supplemented the
  // book's title/author accordingly.
  assert.equal(book?.title, "A Brief Insight to Visishtadvaita Philosophy");
});

test("Library: 55 chapters are available for the book screen, in ascending order", () => {
  const chapters = loadChapters(BOOK_SLUG);
  assert.equal(chapters.length, 55);
  for (let i = 1; i < chapters.length; i++) {
    assert.ok(chapters[i].order > chapters[i - 1].order);
  }
});

test("Library: a chapter body loads for the chapter screen", () => {
  const chapters = loadChapters(BOOK_SLUG);
  const chapter = loadChapter(BOOK_SLUG, chapters[0].slug);
  assert.ok(chapter, "the chapter did not resolve");
  assert.ok(chapter!.body.length > 0);
});

test("Knowledge: the Introduction record resolves for the detail screen", () => {
  const record = loadKnowledgeRecord("introduction");
  assert.ok(record, "introduction did not resolve");
  assert.ok(record!.body.length > 0);
});

test("Search: the offline corpus surfaces Sri Rangam for a matching query", () => {
  const corpus = buildMobileSearchCorpus();
  const results = searchCorpus(corpus, "Rangam");
  assert.ok(
    results.some((r) => r.href === "/divya-desams/sri-rangam"),
    "expected Sri Rangam among the results"
  );
});

test("Search: an empty query returns no results, not the whole corpus", () => {
  const corpus = buildMobileSearchCorpus();
  assert.equal(searchCorpus(corpus, "").length, 0);
});

test("Search: every result href matches this app's own route shape", () => {
  const corpus = buildMobileSearchCorpus();
  const results = searchCorpus(corpus, "Recovered");
  assert.ok(results.length > 0, "expected at least one result for the book's own title text");
  for (const result of results) {
    assert.match(result.href, /^\/(divya-desams|library|knowledge)\//);
  }
});
