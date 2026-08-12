import test from "node:test";
import assert from "node:assert/strict";
import { generateSlugFromTitle, assertNoSlugCollisions } from "../../../scripts/migration/slug.ts";
import { SlugCollisionError } from "../../../scripts/migration/errors.ts";
import { SlugSchema } from "../../../content-lib/schemas/index.ts";

// ---------------------------------------------------------------------------
// B. title -> slug (basic mechanics)
// ---------------------------------------------------------------------------

test("B: a simple title becomes a kebab-case slug", () => {
  assert.equal(generateSlugFromTitle("Example Shrine"), "example-shrine");
});

test("B: the generated slug always satisfies SlugSchema", () => {
  for (const title of [
    "Example Shrine",
    "108) Example Shrine (Test)",
    "Śrī Tēstam",
    "Example,   Temple -- Name",
  ]) {
    const slug = generateSlugFromTitle(title);
    assert.equal(SlugSchema.safeParse(slug).success, true, `expected slug "${slug}" (from "${title}") to satisfy SlugSchema`);
  }
});

// ---------------------------------------------------------------------------
// C. leading numeric noise removal
// ---------------------------------------------------------------------------

test('C: "108) Example Shrine (Test)" -> "example-shrine-test"', () => {
  assert.equal(generateSlugFromTitle("108) Example Shrine (Test)"), "example-shrine-test");
});

test("C: other numeric-prefix shapes are also stripped", () => {
  assert.equal(generateSlugFromTitle("12. Example Shrine"), "example-shrine");
  assert.equal(generateSlugFromTitle("(7) Example Shrine"), "example-shrine");
});

// ---------------------------------------------------------------------------
// D. conservative diacritic handling
// ---------------------------------------------------------------------------

test("D: diacritics are stripped from the slug but displayName-worthy source text is untouched by the function", () => {
  const title = "Śrī Tēstam";
  const slug = generateSlugFromTitle(title);
  // The function is pure -- it never mutates its input. A future
  // transformer sets displayName = source.title directly (untouched),
  // independently of whatever this function returns.
  assert.equal(title, "Śrī Tēstam");
  assert.equal(slug, "sri-testam");
});

// ---------------------------------------------------------------------------
// E. repeated punctuation/whitespace collapsing
// ---------------------------------------------------------------------------

test("E: repeated punctuation and whitespace collapse to single hyphens", () => {
  assert.equal(generateSlugFromTitle("Example   Temple,,  Name"), "example-temple-name");
  assert.equal(generateSlugFromTitle("Example -- Temple"), "example-temple");
  assert.equal(generateSlugFromTitle("  Example Temple  "), "example-temple");
});

// ---------------------------------------------------------------------------
// F. slug collision detection
// ---------------------------------------------------------------------------

test("F: two different synthetic titles producing the same slug fail, identifying both source records", () => {
  const records = [
    { sourcePageId: "page.TestA", slug: generateSlugFromTitle("Example Shrine!") },
    { sourcePageId: "page.TestB", slug: generateSlugFromTitle("Example Shrine?") },
  ];
  // Both titles normalize to the same slug ("example-shrine") once
  // punctuation is stripped -- a genuine, realistic collision shape.
  assert.equal(records[0].slug, records[1].slug);

  assert.throws(() => assertNoSlugCollisions(records), (err: unknown) => {
    assert.ok(err instanceof SlugCollisionError);
    assert.equal(err.slug, "example-shrine");
    assert.deepEqual(err.sourcePageIds.sort(), ["page.TestA", "page.TestB"]);
    return true;
  });
});

test("F: distinct slugs never throw", () => {
  const records = [
    { sourcePageId: "page.TestA", slug: "example-shrine-a" },
    { sourcePageId: "page.TestB", slug: "example-shrine-b" },
  ];
  assert.doesNotThrow(() => assertNoSlugCollisions(records));
});

test("F: collision detection never silently picks a winner (it always throws, never returns a value)", () => {
  const records = [
    { sourcePageId: "page.TestA", slug: "example-shrine" },
    { sourcePageId: "page.TestB", slug: "example-shrine" },
    { sourcePageId: "page.TestC", slug: "example-shrine" },
  ];
  assert.throws(() => assertNoSlugCollisions(records), (err: unknown) => {
    assert.ok(err instanceof SlugCollisionError);
    assert.equal(err.sourcePageIds.length, 3);
    return true;
  });
});
