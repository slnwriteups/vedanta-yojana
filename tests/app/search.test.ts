import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { search } from "../../content-lib/search/index.ts";

/**
 * Phase 5M -- application-layer tests for the search feature: routing,
 * UI source structure, and safety. Corpus/matching/ranking/excerpt logic
 * itself is covered in tests/content/search.test.ts (parallel to how
 * loader tests live in tests/content/ and page-level checks live here).
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

// ---------------------------------------------------------------------------
// ROUTING (27-31)
// ---------------------------------------------------------------------------

test("27: a Divya Desam result links to /divya-desams/[slug]", () => {
  const results = search("Sri Rangam");
  const result = results.find((r) => r.type === "divya-desam");
  assert.ok(result);
  assert.equal(result?.href, "/divya-desams/sri-rangam");
});

test("28: a Book result links to /library/[book]", () => {
  const results = search("Untitled Recovered Book");
  const result = results.find((r) => r.type === "book");
  assert.ok(result);
  assert.equal(result?.href, "/library/untitled-recovered-book-pending-editorial-title");
});

test("29: a Chapter result links to /library/[book]/[chapter]", () => {
  const results = search("Rama Charama Shlokam");
  const result = results.find((r) => r.type === "chapter");
  assert.ok(result);
  assert.equal(
    result?.href,
    "/library/untitled-recovered-book-pending-editorial-title/rama-charama-shlokam"
  );
});

test("30: a Knowledge result links to /knowledge/[slug]", () => {
  const results = search("Introduction");
  const result = results.find((r) => r.type === "knowledge");
  assert.ok(result);
  assert.equal(result?.href, "/knowledge/introduction");
});

test("31: no result href references a filesystem path or content-extraction", () => {
  // Every real href IS root-relative (starts with "/", e.g.
  // "/divya-desams/sri-rangam") -- that is correct and expected for a
  // next/link href, not a filesystem path. What must never appear is an
  // actual repo-relative content path, a reference to the frozen
  // extraction snapshot, or a directory-traversal segment.
  const results = search("temple");
  assert.ok(results.length > 0, "expected at least one result to check");
  for (const result of results) {
    assert.match(result.href, /^\/(divya-desams|library|knowledge)\//);
    assert.ok(!result.href.includes("content/"), result.href);
    assert.ok(!result.href.includes("content-extraction"), result.href);
    assert.ok(!result.href.includes(".."), result.href);
  }
});

// ---------------------------------------------------------------------------
// UI (32-40)
// ---------------------------------------------------------------------------

test("32: the search page has a distinct initial-state branch for no/blank query", () => {
  const resultsSource = read("components/search/SearchResults.tsx");
  assert.ok(resultsSource.includes("Enter a search term"));
});

test("33/34: the search page reads searchParams and preserves the raw query in the form input", () => {
  const pageSource = read("app/search/page.tsx");
  assert.ok(pageSource.includes("searchParams"));
  const formSource = read("components/search/SearchForm.tsx");
  assert.ok(formSource.includes("defaultValue={query}"));
});

test("35/36: SearchResult renders the result title and a visible (non-color-only) type label", () => {
  const source = read("components/search/SearchResult.tsx");
  assert.ok(source.includes("result.title"));
  assert.ok(source.includes("TYPE_LABELS"));
});

test("37: SearchResult renders the parent book title for chapter results", () => {
  const source = read("components/search/SearchResult.tsx");
  assert.ok(source.includes("result.parentTitle"));
});

test("38: SearchResults has a distinct no-results-state branch", () => {
  const source = read("components/search/SearchResults.tsx");
  assert.ok(source.includes("No results found"));
});

test("39: no migration metadata appears anywhere in the search UI source", () => {
  const files = [
    "app/search/page.tsx",
    "components/search/SearchForm.tsx",
    "components/search/SearchResult.tsx",
    "components/search/SearchResults.tsx",
  ];
  for (const relPath of files) {
    const source = read(relPath);
    assert.ok(!source.includes("sourcePageId"), `${relPath} references sourcePageId`);
    assert.ok(!source.includes("extractionConfidence"), `${relPath} references extractionConfidence`);
  }
});

// ---------------------------------------------------------------------------
// Server-rendered, no client component, no JS required for basic submission.
// ---------------------------------------------------------------------------

test("the search feature has no client components -- no \"use client\" anywhere", () => {
  const files = [
    "app/search/page.tsx",
    "components/search/SearchForm.tsx",
    "components/search/SearchResult.tsx",
    "components/search/SearchResults.tsx",
  ];
  for (const relPath of files) {
    const source = read(relPath);
    assert.ok(!source.includes('"use client"'), `${relPath} is a client component`);
  }
});

test("SearchForm is a plain GET form (works without JavaScript)", () => {
  const source = read("components/search/SearchForm.tsx");
  assert.ok(source.includes('method="GET"'));
  assert.ok(source.includes('action="/search"'));
});

test("no search-related file uses dangerouslySetInnerHTML or constructs a RegExp from user input", () => {
  const files = [
    "app/search/page.tsx",
    "components/search/SearchForm.tsx",
    "components/search/SearchResult.tsx",
    "components/search/SearchResults.tsx",
    "content-lib/search/match.ts",
    "content-lib/search/excerpt.ts",
  ];
  for (const relPath of files) {
    const source = read(relPath);
    assert.ok(!source.includes("dangerouslySetInnerHTML"), relPath);
    assert.ok(!source.includes("new RegExp("), relPath);
    assert.ok(!source.includes("eval("), relPath);
  }
});

// ---------------------------------------------------------------------------
// No search dependency was installed.
// ---------------------------------------------------------------------------

test("no new search dependency appears in package.json", () => {
  const pkg = JSON.parse(read("package.json"));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const forbidden of ["pagefind", "fuse.js", "lunr", "minisearch", "algoliasearch", "@elastic/elasticsearch", "meilisearch", "typesense"]) {
    assert.ok(!(forbidden in allDeps), `unexpected dependency: ${forbidden}`);
  }
});
