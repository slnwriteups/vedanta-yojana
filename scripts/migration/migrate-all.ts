import fs from "node:fs";
import path from "node:path";
import {
  BookSchema,
  ChapterSchema,
  DivyaDesamSchema,
  KnowledgeSchema,
  type Book,
  type Chapter,
  type DivyaDesam,
  type Knowledge,
} from "../../content-lib/schemas/index.ts";
import {
  adaptExtractionDivyaDesamRecord,
  adaptImageRegistry,
  type RawExtractionDivyaDesamRecord,
  type RawExternalLinkRecord,
  type RawImageMapEntry,
} from "./adapters/extraction-source-adapter.ts";
import { transformBook, transformChapter } from "./book.ts";
import { transformDivyaDesam } from "./divya-desam.ts";
import { SlugCollisionError } from "./errors.ts";
import { holdBackUnresolvedRecord } from "./held-back.ts";
import { transformKnowledge } from "./knowledge.ts";
import { assertNoSlugCollisions, generateSlugFromTitle } from "./slug.ts";
import type { SourceChapterRecord, SourceDivyaDesamRecord, SourceImageRegistry } from "./types.ts";

/**
 * Phase 5H — Full Content Migration.
 *
 * Orchestration (filesystem-aware) code, per the same pattern established
 * by Phase 5F's migrate-page5.ts: it reads the frozen content-extraction/
 * snapshot, adapts + transforms every intended record using the existing
 * pure Phase 5E transformation functions and the Phase 5F adapter (never
 * a second/parallel implementation), validates everything BEFORE writing
 * anything, and only then writes to /content.
 *
 * Run with: node scripts/migration/migrate-all.ts
 */

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const DIVYA_DESAMS_SOURCE_DIR = path.join(REPO_ROOT, "content-extraction/divya-desams");
const ARTICLES_SOURCE_DIR = path.join(REPO_ROOT, "content-extraction/articles");
const IMAGE_MAP_FILE = path.join(REPO_ROOT, "content-extraction/image-map.json");
const EXTERNAL_LINKS_FILE = path.join(REPO_ROOT, "content-extraction/resources/external-links.json");

const OUTPUT_DD_DIR = path.join(REPO_ROOT, "content/divya-desams");
const OUTPUT_LIBRARY_DIR = path.join(REPO_ROOT, "content/library");
const OUTPUT_KNOWLEDGE_DIR = path.join(REPO_ROOT, "content/knowledge");
const OUTPUT_UNRESOLVED_DIR = path.join(REPO_ROOT, "content/_unresolved");

const KNOWLEDGE_PAGE_ID = "page.Page4";
const HELD_BACK_PAGE_ID = "page.Page150";
const EXPECTED_KNOWN_GAP_PAGE_IDS = new Set(["page.Page112", "page.Page115", "page.Page116"]);

// A book identity that is honestly labeled as provisional rather than
// fabricated as if it were the real, editorially-confirmed title/author
// (which Phase 5A/4A established remains an open human decision).
// sourcePageId is an explicit "aggregate" marker, not a fabricated single
// real page reference -- no single source page IS the whole book.
const BOOK_TITLE = "Untitled Recovered Book (pending editorial title)";
const BOOK_SOURCE_PAGE_ID_RANGE = "aggregate:page113-page171";

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listSourceFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json") && e.name !== "index.json")
    .map((e) => path.join(dir, e.name))
    .sort();
}

function deriveNumericOrder(pageId: string): number {
  const match = pageId.match(/^page\.Page(\d+)$/);
  if (!match) {
    throw new Error(`Cannot derive a numeric order from pageId "${pageId}" -- expected the "page.PageN" shape.`);
  }
  return parseInt(match[1], 10);
}

function main(): void {
  console.log("=== Phase 5H: loading source data ===");

  const imageMap = readJson(IMAGE_MAP_FILE) as { images: RawImageMapEntry[] };
  const externalLinksData = readJson(EXTERNAL_LINKS_FILE) as { links: RawExternalLinkRecord[] };

  // ---------------------------------------------------------------------
  // 1. Load + validate all 108 Divya Desam source records.
  // ---------------------------------------------------------------------

  const ddFiles = listSourceFiles(DIVYA_DESAMS_SOURCE_DIR);
  if (ddFiles.length !== 108) {
    throw new Error(`Expected exactly 108 files under ${DIVYA_DESAMS_SOURCE_DIR}, found ${ddFiles.length}.`);
  }

  const rawDdRecords = ddFiles.map((f) => readJson(f) as RawExtractionDivyaDesamRecord);

  const highConfidence = rawDdRecords.filter((r) => r.classification.confidence === "high");
  const lowConfidence = rawDdRecords.filter((r) => r.classification.confidence === "low");
  if (highConfidence.length !== 106 || lowConfidence.length !== 2) {
    throw new Error(
      `Expected 106 high-confidence + 2 low-confidence Divya Desam records, found ${highConfidence.length} high + ${lowConfidence.length} low.`
    );
  }
  const lowConfidencePageIds = new Set(lowConfidence.map((r) => r.pageId));
  if (!lowConfidencePageIds.has("page.Page93") || !lowConfidencePageIds.has(HELD_BACK_PAGE_ID)) {
    throw new Error(
      `Expected the 2 low-confidence records to be exactly page.Page93 and ${HELD_BACK_PAGE_ID}, found: ${[...lowConfidencePageIds].join(", ")}`
    );
  }

  const page150Raw = rawDdRecords.find((r) => r.pageId === HELD_BACK_PAGE_ID)!;
  const normalDdRawRecords = rawDdRecords.filter((r) => r.pageId !== HELD_BACK_PAGE_ID);
  if (normalDdRawRecords.length !== 107) {
    throw new Error(`Expected 107 records to become normal DivyaDesam records (108 minus Page150 held back), found ${normalDdRawRecords.length}.`);
  }

  console.log(`Loaded ${ddFiles.length} Divya Desam source records (106 high, 2 low: Page93 + Page150).`);

  // ---------------------------------------------------------------------
  // 2. Load + validate the 56 article source records -> 1 Knowledge + 55 chapters.
  // ---------------------------------------------------------------------

  const articleFiles = listSourceFiles(ARTICLES_SOURCE_DIR);
  if (articleFiles.length !== 56) {
    throw new Error(`Expected exactly 56 files under ${ARTICLES_SOURCE_DIR}, found ${articleFiles.length}.`);
  }
  const rawArticleRecords = articleFiles.map((f) => readJson(f) as RawExtractionDivyaDesamRecord);

  const page4Raw = rawArticleRecords.find((r) => r.pageId === KNOWLEDGE_PAGE_ID);
  if (!page4Raw) {
    throw new Error(`Expected to find ${KNOWLEDGE_PAGE_ID} ("Introduction") among the article source records.`);
  }
  const chapterRawRecords = rawArticleRecords.filter((r) => r.pageId !== KNOWLEDGE_PAGE_ID);
  if (chapterRawRecords.length !== 55) {
    throw new Error(`Expected exactly 55 book-chapter candidate records (56 articles minus Page4), found ${chapterRawRecords.length}.`);
  }
  if (chapterRawRecords.some((r) => r.pageId === HELD_BACK_PAGE_ID)) {
    throw new Error(`${HELD_BACK_PAGE_ID} must not appear among the 55 book-chapter candidates.`);
  }
  for (const gapPageId of EXPECTED_KNOWN_GAP_PAGE_IDS) {
    if (rawArticleRecords.some((r) => r.pageId === gapPageId) || rawDdRecords.some((r) => r.pageId === gapPageId)) {
      throw new Error(`Known source gap ${gapPageId} unexpectedly appears in the migratable record set -- it must remain unmigrated.`);
    }
  }

  console.log(`Loaded ${articleFiles.length} article source records (1 Knowledge: Page4, 55 book chapters).`);

  // ---------------------------------------------------------------------
  // 3. Adapt every source record (reusing the Phase 5F adapter -- it is
  // structurally generic, not Page5-specific, and works identically for
  // divya-desams/ and articles/ records since both share the same raw
  // extraction shape).
  // ---------------------------------------------------------------------

  function crossReferenceLinksFor(pageId: string): RawExternalLinkRecord[] {
    return externalLinksData.links.filter((l) => l.pageId === pageId);
  }

  const adaptedNormalDd: SourceDivyaDesamRecord[] = normalDdRawRecords.map((raw) =>
    adaptExtractionDivyaDesamRecord(raw, crossReferenceLinksFor(raw.pageId))
  );
  const adaptedPage150 = adaptExtractionDivyaDesamRecord(page150Raw, crossReferenceLinksFor(page150Raw.pageId));
  const adaptedPage4 = adaptExtractionDivyaDesamRecord(page4Raw, crossReferenceLinksFor(page4Raw.pageId));
  const adaptedChapters = chapterRawRecords.map((raw) =>
    adaptExtractionDivyaDesamRecord(raw, crossReferenceLinksFor(raw.pageId))
  );

  // ---------------------------------------------------------------------
  // 4. Slug generation + collision detection, BEFORE any write.
  // ---------------------------------------------------------------------

  const ddSlugChecks = adaptedNormalDd.map((r) => ({
    sourcePageId: r.pageId,
    slug: generateSlugFromTitle(r.title),
  }));
  assertNoSlugCollisions(ddSlugChecks); // throws SlugCollisionError on any collision

  const chapterSlugChecks = adaptedChapters.map((r) => ({
    sourcePageId: r.pageId,
    slug: generateSlugFromTitle(r.title),
  }));
  assertNoSlugCollisions(chapterSlugChecks);

  console.log(`Generated and validated ${ddSlugChecks.length} Divya Desam slugs and ${chapterSlugChecks.length} chapter slugs -- no collisions.`);

  // ---------------------------------------------------------------------
  // 5. Image registry resolution (fail loud on any missing UUID).
  // ---------------------------------------------------------------------

  const allReferencedUuids = [
    ...adaptedNormalDd.flatMap((r) => r.imageAssetRefs),
    ...adaptedChapters.flatMap((r) => r.imageAssetRefs),
    ...adaptedPage4.imageAssetRefs,
  ];
  const imageRegistry: SourceImageRegistry = adaptImageRegistry(imageMap.images, [
    ...new Set(allReferencedUuids),
  ]);
  const context = { imageRegistry };

  console.log(`Resolved ${imageRegistry.size} distinct image assets referenced by the migrated set.`);

  // ---------------------------------------------------------------------
  // 6. Transform everything (all pure, all validated via their own
  // schema inside each transform* function).
  // ---------------------------------------------------------------------

  const transformedDd: DivyaDesam[] = adaptedNormalDd.map((source) => transformDivyaDesam(source, context));

  const heldBackPage150 = holdBackUnresolvedRecord(adaptedPage150);

  const knowledgeRecord: Knowledge = transformKnowledge(
    {
      pageId: adaptedPage4.pageId,
      title: adaptedPage4.title,
      contentType: "educational",
      classification: adaptedPage4.classification,
      contentBlocks: adaptedPage4.contentBlocks,
      imageAssetRefs: adaptedPage4.imageAssetRefs,
    },
    context
  );

  const chapterOrderByPageId = new Map(adaptedChapters.map((r) => [r.pageId, deriveNumericOrder(r.pageId)]));
  const transformedChapters: Chapter[] = adaptedChapters.map((source) => {
    const chapterSource: SourceChapterRecord = {
      pageId: source.pageId,
      title: source.title,
      order: chapterOrderByPageId.get(source.pageId)!,
      classification: source.classification,
      contentBlocks: source.contentBlocks,
      imageAssetRefs: source.imageAssetRefs,
    };
    return transformChapter(chapterSource, context);
  });

  // Duplicate chapter-order detection, even though pageId-derived order
  // values are unique by construction -- checked explicitly rather than
  // assumed.
  const orderCounts = new Map<number, string[]>();
  for (const ch of transformedChapters) {
    const list = orderCounts.get(ch.order) ?? [];
    list.push(ch.migration.sourcePageId);
    orderCounts.set(ch.order, list);
  }
  for (const [order, pageIds] of orderCounts) {
    if (pageIds.length > 1) {
      throw new Error(`Duplicate chapter order ${order} across: ${pageIds.join(", ")}`);
    }
  }

  const bookInput = {
    pageId: BOOK_SOURCE_PAGE_ID_RANGE,
    title: BOOK_TITLE,
    classification: { category: "non_temple_content_candidate", confidence: "medium" as const },
  };
  const bookRecord: Book = transformBook(bookInput);
  const bookWithChapterOrder: Book = BookSchema.parse({
    ...bookRecord,
    // needsReview is forced true here (not derivable from `bookInput`'s
    // classification, which reflects extraction confidence, not editorial
    // state): the book's TITLE itself is an explicit placeholder pending
    // your decision (Phase 5A/4A's open question), which is exactly what
    // needsReview exists to signal.
    migration: { ...bookRecord.migration, needsReview: true },
    chapterOrder: [...transformedChapters]
      .sort((a, b) => a.order - b.order)
      .map((c) => c.slug),
  });

  console.log(`Transformed ${transformedDd.length} Divya Desam records, 1 held-back record (Page150), ${transformedChapters.length} chapters, 1 Book, 1 Knowledge record.`);

  // ---------------------------------------------------------------------
  // 7. Independent re-validation against destination schemas (belt and
  // suspenders, matching the Phase 5F pattern).
  // ---------------------------------------------------------------------

  for (const record of transformedDd) {
    const result = DivyaDesamSchema.safeParse(record);
    if (!result.success) throw new Error(`DivyaDesamSchema validation failed for ${record.migration.sourcePageId}: ${JSON.stringify(result.error.issues)}`);
  }
  for (const record of transformedChapters) {
    const result = ChapterSchema.safeParse(record);
    if (!result.success) throw new Error(`ChapterSchema validation failed for ${record.migration.sourcePageId}: ${JSON.stringify(result.error.issues)}`);
  }
  {
    const result = KnowledgeSchema.safeParse(knowledgeRecord);
    if (!result.success) throw new Error(`KnowledgeSchema validation failed for Page4: ${JSON.stringify(result.error.issues)}`);
  }
  {
    const result = BookSchema.safeParse(bookWithChapterOrder);
    if (!result.success) throw new Error(`BookSchema validation failed for the book record: ${JSON.stringify(result.error.issues)}`);
  }

  console.log("All transformed records independently re-validated against their destination schemas.");

  // ---------------------------------------------------------------------
  // 8. Write everything. Never overwrite an existing file (this
  // preserves content/divya-desams/sri-rangam.json from Phase 5F
  // automatically, generically, without hardcoding "Page5").
  // ---------------------------------------------------------------------

  fs.mkdirSync(OUTPUT_DD_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_KNOWLEDGE_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_UNRESOLVED_DIR, { recursive: true });

  let written = 0;
  let skippedExisting = 0;

  function writeIfAbsent(filePath: string, data: unknown): void {
    if (fs.existsSync(filePath)) {
      console.log(`  skip (already exists): ${path.relative(REPO_ROOT, filePath)}`);
      skippedExisting++;
      return;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    written++;
  }

  console.log("=== Writing Divya Desam records ===");
  for (const record of transformedDd) {
    writeIfAbsent(path.join(OUTPUT_DD_DIR, `${record.slug}.json`), record);
  }

  console.log("=== Writing held-back Page150 record ===");
  writeIfAbsent(path.join(OUTPUT_UNRESOLVED_DIR, "page.Page150.json"), heldBackPage150);

  console.log("=== Writing Knowledge record (Page4) ===");
  writeIfAbsent(path.join(OUTPUT_KNOWLEDGE_DIR, `${knowledgeRecord.slug}.json`), knowledgeRecord);

  console.log("=== Writing Book + chapters ===");
  const bookDir = path.join(OUTPUT_LIBRARY_DIR, bookWithChapterOrder.slug);
  writeIfAbsent(path.join(bookDir, "book.json"), bookWithChapterOrder);
  for (const chapter of transformedChapters) {
    writeIfAbsent(path.join(bookDir, "chapters", `${chapter.slug}.json`), chapter);
  }

  console.log(`\nDone. ${written} file(s) written, ${skippedExisting} already existed and were left untouched.`);
}

main();
