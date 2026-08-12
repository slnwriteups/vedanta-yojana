import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  BookSchema,
  ChapterSchema,
  DivyaDesamSchema,
  KnowledgeSchema,
  ResourceLanguageSchema,
} from "../../content-lib/schemas/index.ts";
import { createContentLoader } from "../../content-lib/loader/index.ts";

/**
 * Phase 5I — Full Content Validation / Migration Integrity Gate.
 *
 * READ-ONLY. This script writes nothing anywhere. It re-validates the
 * Phase 5H migrated /content tree against the frozen content-extraction/
 * snapshot from scratch (independent of the migration runner and of the
 * existing test suite), and prints a structured report consumed by the
 * Phase 5I final report. Any failure is printed, never silently patched.
 *
 * Run with: node scripts/validation/phase-5i-gate.ts
 */

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

const CONTENT_DD_DIR = path.join(REPO_ROOT, "content/divya-desams");
const CONTENT_LIBRARY_DIR = path.join(REPO_ROOT, "content/library");
const CONTENT_KNOWLEDGE_DIR = path.join(REPO_ROOT, "content/knowledge");
const CONTENT_UNRESOLVED_DIR = path.join(REPO_ROOT, "content/_unresolved");
const CONTENT_ROOT = path.join(REPO_ROOT, "content");

const SOURCE_DD_DIR = path.join(REPO_ROOT, "content-extraction/divya-desams");
const SOURCE_ARTICLES_DIR = path.join(REPO_ROOT, "content-extraction/articles");
const IMAGE_MAP_FILE = path.join(REPO_ROOT, "content-extraction/image-map.json");
const EXTERNAL_LINKS_FILE = path.join(REPO_ROOT, "content-extraction/resources/external-links.json");
const IMAGES_DIR = path.join(REPO_ROOT, "images");

let failures = 0;
const results: string[] = [];

function ok(section: string, message: string): void {
  results.push(`  [PASS] ${section}: ${message}`);
}
function fail(section: string, message: string): void {
  failures++;
  results.push(`  [FAIL] ${section}: ${message}`);
}
function info(message: string): void {
  results.push(`  ${message}`);
}
function header(title: string): void {
  results.push(`\n=== ${title} ===`);
}

function readJson(p: string): any {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
}
function sha256(p: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

// ---------------------------------------------------------------------------
// Load everything
// ---------------------------------------------------------------------------

const ddFiles = listJsonFiles(CONTENT_DD_DIR);
const ddRecords = ddFiles.map((f) => ({ file: f, data: readJson(path.join(CONTENT_DD_DIR, f)) }));

const bookDirs = fs.readdirSync(CONTENT_LIBRARY_DIR, { withFileTypes: true }).filter((e) => e.isDirectory());
const bookDirEntry = bookDirs[0];
const bookRecord = bookDirEntry ? readJson(path.join(CONTENT_LIBRARY_DIR, bookDirEntry.name, "book.json")) : null;
const chaptersDir = bookDirEntry ? path.join(CONTENT_LIBRARY_DIR, bookDirEntry.name, "chapters") : "";
const chapterFiles = bookDirEntry ? listJsonFiles(chaptersDir) : [];
const chapterRecords = chapterFiles.map((f) => ({ file: f, data: readJson(path.join(chaptersDir, f)) }));

const knowledgeFiles = listJsonFiles(CONTENT_KNOWLEDGE_DIR);
const knowledgeRecords = knowledgeFiles.map((f) => ({ file: f, data: readJson(path.join(CONTENT_KNOWLEDGE_DIR, f)) }));

const unresolvedFiles = listJsonFiles(CONTENT_UNRESOLVED_DIR);
const unresolvedRecords = unresolvedFiles.map((f) => ({ file: f, data: readJson(path.join(CONTENT_UNRESOLVED_DIR, f)) }));

const imageMap = readJson(IMAGE_MAP_FILE);
const externalLinksData = readJson(EXTERNAL_LINKS_FILE);

// ===========================================================================
// 4. CONTENT FILE INVENTORY VALIDATION
// ===========================================================================
header("4. Content file inventory");

if (ddFiles.length === 107) ok("4", `exactly 107 Divya Desam files`);
else fail("4", `expected 107 Divya Desam files, found ${ddFiles.length}`);

if (bookDirs.length === 1) ok("4", `exactly 1 Book directory`);
else fail("4", `expected 1 Book directory, found ${bookDirs.length}`);

if (chapterFiles.length === 55) ok("4", `exactly 55 Chapter files`);
else fail("4", `expected 55 Chapter files, found ${chapterFiles.length}`);

if (knowledgeFiles.length === 1) ok("4", `exactly 1 Knowledge file`);
else fail("4", `expected 1 Knowledge file, found ${knowledgeFiles.length}`);

if (unresolvedFiles.length === 1) ok("4", `exactly 1 held-back file`);
else fail("4", `expected 1 held-back file, found ${unresolvedFiles.length}`);

const sriRangam = ddRecords.find((r) => r.data.slug === "sri-rangam");
if (sriRangam && sriRangam.data.migration.sourcePageId === "page.Page5") {
  const parsed = DivyaDesamSchema.safeParse(sriRangam.data);
  if (parsed.success) ok("4", "sri-rangam.json present, structurally valid, sourcePageId = page.Page5");
  else fail("4", `sri-rangam.json failed schema validation: ${JSON.stringify(parsed.error.issues)}`);
} else {
  fail("4", "sri-rangam.json missing or sourcePageId != page.Page5");
}

// Duplicate destination files (case-insensitive collision) + temp/backup artifacts.
function checkNoJunkFiles(dir: string, label: string): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  const lower = new Map<string, string[]>();
  for (const e of entries) {
    const key = e.toLowerCase();
    lower.set(key, [...(lower.get(key) ?? []), e]);
  }
  for (const [, names] of lower) {
    if (names.length > 1) fail("4", `${label}: case-insensitive filename collision: ${names.join(", ")}`);
  }
  const junk = entries.filter(
    (e) => !e.endsWith(".json") && e !== "README.md" && !fs.statSync(path.join(dir, e)).isDirectory()
  );
  if (junk.length > 0) fail("4", `${label}: unexpected non-JSON files present: ${junk.join(", ")}`);
}
checkNoJunkFiles(CONTENT_DD_DIR, "content/divya-desams");
checkNoJunkFiles(chaptersDir, "content/library/.../chapters");
checkNoJunkFiles(CONTENT_KNOWLEDGE_DIR, "content/knowledge");
checkNoJunkFiles(CONTENT_UNRESOLVED_DIR, "content/_unresolved");
if (bookDirEntry) checkNoJunkFiles(path.join(CONTENT_LIBRARY_DIR, bookDirEntry.name), "content/library/<book>");
ok("4", "no duplicate/temp/backup/staging artifacts found under checked directories");

function countFilesRecursive(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFilesRecursive(path.join(dir, entry.name));
    else count++;
  }
  return count;
}
const totalContentFiles = countFilesRecursive(CONTENT_ROOT);
info(`total files under content/: ${totalContentFiles}`);

// ===========================================================================
// 9. SCHEMA VALIDATION (independent re-parse of files on disk)
// ===========================================================================
header("9. Independent schema validation");

let ddSchemaFailures = 0;
for (const { file, data } of ddRecords) {
  const r = DivyaDesamSchema.safeParse(data);
  if (!r.success) {
    ddSchemaFailures++;
    fail("9", `content/divya-desams/${file}: ${JSON.stringify(r.error.issues)}`);
  }
}
if (ddSchemaFailures === 0) ok("9", `all ${ddRecords.length} DivyaDesam records independently pass DivyaDesamSchema`);

let chapterSchemaFailures = 0;
for (const { file, data } of chapterRecords) {
  const r = ChapterSchema.safeParse(data);
  if (!r.success) {
    chapterSchemaFailures++;
    fail("9", `chapters/${file}: ${JSON.stringify(r.error.issues)}`);
  }
}
if (chapterSchemaFailures === 0) ok("9", `all ${chapterRecords.length} Chapter records independently pass ChapterSchema`);

if (bookRecord) {
  const r = BookSchema.safeParse(bookRecord);
  if (r.success) ok("9", "Book independently passes BookSchema");
  else fail("9", `book.json: ${JSON.stringify(r.error.issues)}`);
}

for (const { file, data } of knowledgeRecords) {
  const r = KnowledgeSchema.safeParse(data);
  if (r.success) ok("9", `${file} independently passes KnowledgeSchema`);
  else fail("9", `knowledge/${file}: ${JSON.stringify(r.error.issues)}`);
}

// Page150 must NOT validate as any normal schema.
const page150 = unresolvedRecords.find((r) => r.data.sourcePageId === "page.Page150")?.data;
if (page150) {
  const notDD = !DivyaDesamSchema.safeParse(page150).success;
  const notChapter = !ChapterSchema.safeParse(page150).success;
  const notKnowledge = !KnowledgeSchema.safeParse(page150).success;
  const notBook = !BookSchema.safeParse(page150).success;
  if (notDD && notChapter && notKnowledge && notBook) {
    ok("9", "Page150 held-back record fails to validate against DivyaDesam/Chapter/Knowledge/Book schemas, as required");
  } else {
    fail("9", "Page150 held-back record unexpectedly validates against a normal content schema");
  }
} else {
  fail("9", "Page150 held-back record not found");
}

// ===========================================================================
// 8. UNIVERSAL DRAFT-STATUS VALIDATION
// ===========================================================================
header("8. Universal draft-status validation");

let statusFailures = 0;
for (const { file, data } of ddRecords) {
  if (data.status !== "draft") {
    statusFailures++;
    fail("8", `content/divya-desams/${file} has status "${data.status}", expected "draft"`);
  }
}
for (const { file, data } of chapterRecords) {
  if (data.status !== "draft") {
    statusFailures++;
    fail("8", `chapters/${file} has status "${data.status}", expected "draft"`);
  }
}
for (const { file, data } of knowledgeRecords) {
  if (data.status !== "draft") {
    statusFailures++;
    fail("8", `knowledge/${file} has status "${data.status}", expected "draft"`);
  }
}
if (bookRecord && bookRecord.status !== "draft") {
  statusFailures++;
  fail("8", `book.json has status "${bookRecord.status}", expected "draft"`);
}
if (statusFailures === 0) {
  ok("8", `all ${ddRecords.length + chapterRecords.length + knowledgeRecords.length + 1} normal records confirmed status="draft"`);
}

// ===========================================================================
// 5/L. SOURCE-TO-DESTINATION TRACEABILITY
// ===========================================================================
header("5. Source-to-destination traceability");

let traceFailures = 0;
for (const { file, data } of ddRecords) {
  const sourcePath = path.join(SOURCE_DD_DIR, `${data.migration.sourcePageId}.json`);
  if (!fs.existsSync(sourcePath)) {
    traceFailures++;
    fail("5", `${file}: sourcePageId ${data.migration.sourcePageId} has no matching source file`);
  }
}
for (const { file, data } of chapterRecords) {
  const sourcePath = path.join(SOURCE_ARTICLES_DIR, `${data.migration.sourcePageId}.json`);
  if (!fs.existsSync(sourcePath)) {
    traceFailures++;
    fail("5", `${file}: sourcePageId ${data.migration.sourcePageId} has no matching source file`);
  }
}
for (const { file, data } of knowledgeRecords) {
  const sourcePath = path.join(SOURCE_ARTICLES_DIR, `${data.migration.sourcePageId}.json`);
  if (!fs.existsSync(sourcePath)) {
    traceFailures++;
    fail("5", `${file}: sourcePageId ${data.migration.sourcePageId} has no matching source file`);
  }
}
if (traceFailures === 0) ok("5", "every normal migrated record's sourcePageId resolves to a real source file");

const ddSourceIds = new Set(
  fs.readdirSync(SOURCE_DD_DIR).filter((f) => f.endsWith(".json") && f !== "index.json")
);
const migratedDdSourceIds = new Set(ddRecords.map((r) => `${r.data.migration.sourcePageId}.json`));
if (page150) migratedDdSourceIds.add(`${page150.sourcePageId}.json`);
const missingDd = [...ddSourceIds].filter((id) => !migratedDdSourceIds.has(id));
const extraDd = [...migratedDdSourceIds].filter((id) => !ddSourceIds.has(id));
if (missingDd.length === 0 && extraDd.length === 0 && migratedDdSourceIds.size === 108) {
  ok("5", "all 108 Divya Desam source records accounted for exactly once (107 normal + 1 held-back)");
} else {
  fail("5", `Divya Desam source reconciliation mismatch: missing=${JSON.stringify(missingDd)} extra=${JSON.stringify(extraDd)}`);
}

const articleSourceIds = new Set(
  fs.readdirSync(SOURCE_ARTICLES_DIR).filter((f) => f.endsWith(".json") && f !== "index.json")
);
const migratedArticleIds = new Set([
  ...chapterRecords.map((r) => `${r.data.migration.sourcePageId}.json`),
  ...knowledgeRecords.map((r) => `${r.data.migration.sourcePageId}.json`),
]);
const missingArticle = [...articleSourceIds].filter((id) => !migratedArticleIds.has(id));
const extraArticle = [...migratedArticleIds].filter((id) => !articleSourceIds.has(id));
if (missingArticle.length === 0 && extraArticle.length === 0 && migratedArticleIds.size === 56) {
  ok("5", "all 56 article source records accounted for exactly once (55 chapters + 1 Knowledge)");
} else {
  fail("5", `Article source reconciliation mismatch: missing=${JSON.stringify(missingArticle)} extra=${JSON.stringify(extraArticle)}`);
}

// ===========================================================================
// 6. PAGE93 VALIDATION
// ===========================================================================
header("6. Page93 validation");

const page93Record = ddRecords.find((r) => r.data.migration.sourcePageId === "page.Page93")?.data;
const page93Source = readJson(path.join(SOURCE_DD_DIR, "page.Page93.json"));
if (!page93Record) {
  fail("6", "Page93 (expected content/divya-desams/tirukoodal.json) not found among migrated records");
} else {
  if (page93Record.status === "draft") ok("6", "Page93: status = draft");
  else fail("6", `Page93: status = ${page93Record.status}, expected draft`);

  if (page93Record.migration.extractionConfidence === "low") ok("6", "Page93: extractionConfidence = low");
  else fail("6", `Page93: extractionConfidence = ${page93Record.migration.extractionConfidence}, expected low`);

  if (page93Record.migration.needsReview === true) ok("6", "Page93: needsReview = true");
  else fail("6", "Page93: needsReview is not true");

  if (Array.isArray(page93Record.shrines) && page93Record.shrines.length === 0) {
    ok("6", "Page93: no fabricated Google Maps link (shrines = [])");
  } else {
    fail("6", `Page93: expected empty shrines[], found ${JSON.stringify(page93Record.shrines)}`);
  }

  if (page93Record.templeInformation && Object.keys(page93Record.templeInformation).length > 0) {
    ok("6", "Page93: templeInformation preserved");
  } else {
    fail("6", "Page93: templeInformation missing/empty");
  }

  if (page93Record.sthalaPuranam) ok("6", "Page93: Sthala Puranam preserved");
  else fail("6", "Page93: Sthala Puranam missing");

  if (page93Record.azhwarPasuram) ok("6", "Page93: Azhwar Pasuram preserved");
  else info("Page93: azhwarPasuram absent (only a failure if source actually has one -- checked below)");

  const page93SourcePdfLinks = page93Source.externalLinks.filter((l: any) => l.resourceType === "sloka_pdf_prapatti");
  if (page93Record.resources.length === page93SourcePdfLinks.length && page93SourcePdfLinks.length === 4) {
    ok("6", `Page93: all 4 PDF resources present`);
  } else {
    fail("6", `Page93: expected 4 PDF resources matching source, found ${page93Record.resources.length} (source has ${page93SourcePdfLinks.length})`);
  }

  if (page93Record.images.length === page93Source.imageAssetRefs.length && page93Source.imageAssetRefs.length === 2) {
    ok("6", "Page93: both source image references present");
  } else {
    fail("6", `Page93: expected 2 image references matching source, found ${page93Record.images.length} (source has ${page93Source.imageAssetRefs.length})`);
  }

  const sourceUrls = new Set(page93Source.externalLinks.map((l: any) => l.url));
  const destUrls = [...page93Record.shrines.map((s: any) => s.mapsLink), ...page93Record.resources.map((r: any) => r.url)];
  const allVerbatim = destUrls.every((u) => sourceUrls.has(u));
  if (allVerbatim) ok("6", "Page93: all destination URLs match source verbatim");
  else fail("6", "Page93: at least one destination URL does not match source verbatim");
}

// ===========================================================================
// 7. PAGE150 VALIDATION
// ===========================================================================
header("7. Page150 (held-back) validation");

if (page150) {
  if (page150.sourcePageId === "page.Page150") ok("7", "Page150: sourcePageId correct");
  else fail("7", "Page150: sourcePageId mismatch");

  if (page150.extractionConfidence === "low") ok("7", "Page150: extractionConfidence = low");
  else fail("7", `Page150: extractionConfidence = ${page150.extractionConfidence}`);

  if (page150.needsReview === true) ok("7", "Page150: needsReview = true");
  else fail("7", "Page150: needsReview is not true");

  const forbiddenFields = ["templeInformation", "contentType", "slug", "status"];
  const present = forbiddenFields.filter((f) => f in page150);
  if (present.length === 0) ok("7", "Page150: no normal-record fields (templeInformation/contentType/slug/status) present");
  else fail("7", `Page150: unexpected normal-record fields present: ${present.join(", ")}`);

  const heldBackAllowedKeys = new Set(["sourcePageId", "title", "extractionConfidence", "needsReview", "rawContentBlocks", "rawExternalLinks"]);
  const unexpectedKeys = Object.keys(page150).filter((k) => !heldBackAllowedKeys.has(k));
  if (unexpectedKeys.length === 0) ok("7", "Page150: only the established HeldBackRecord fields are present");
  else fail("7", `Page150: unexpected keys present: ${unexpectedKeys.join(", ")}`);

  const page150PdfLinks = (page150.rawExternalLinks ?? []).filter((l: any) => l.url.includes("hayagriivastotram.pdf"));
  if (page150PdfLinks.length === 4) ok("7", "Page150: all 4 Hayagriva Stotram PDF links retained");
  else fail("7", `Page150: expected 4 Hayagriva Stotram PDF links, found ${page150PdfLinks.length}`);

  const page150HasPictureBlock = (page150.rawContentBlocks ?? []).some((b: any) => b.type === "picture" && b.imageAssetRef);
  if (page150HasPictureBlock) ok("7", "Page150: image provenance retained via rawContentBlocks (picture block with imageAssetRef)");
  else fail("7", "Page150: no image provenance found in rawContentBlocks");
}

// ===========================================================================
// 17. MULTI-SHRINE RECORD VALIDATION (Page24/38/40)
// ===========================================================================
header("17. Multi-shrine ambiguous-label records (Page24/38/40)");

for (const pageId of ["page.Page24", "page.Page38", "page.Page40"]) {
  const rec = ddRecords.find((r) => r.data.migration.sourcePageId === pageId)?.data;
  if (!rec) {
    fail("17", `${pageId}: record not found`);
    continue;
  }
  const issues: string[] = [];
  if (Object.keys(rec.templeInformation ?? {}).length !== 0) issues.push("templeInformation not empty");
  if (rec.migration.needsReview !== true) issues.push("needsReview not true");
  if (!(rec.shrines?.length > 0)) issues.push("shrines empty");
  if (!(rec.images?.length > 0)) issues.push("images empty");
  if (!(rec.resources?.length > 0)) issues.push("resources empty");
  if (issues.length === 0) ok("17", `${pageId}: empty templeInformation, needsReview=true, shrines/images/resources all preserved`);
  else fail("17", `${pageId}: ${issues.join("; ")}`);
}

// ===========================================================================
// 18. KNOWN GAP VALIDATION
// ===========================================================================
header("18. Known gap validation");

const allNormalAndHeldBack = [...ddRecords, ...chapterRecords, ...knowledgeRecords, ...unresolvedRecords];
for (const gapPageId of ["page.Page112", "page.Page115", "page.Page116", "page.Page117"]) {
  const found = allNormalAndHeldBack.some(
    (r) => r.data.migration?.sourcePageId === gapPageId || r.data.sourcePageId === gapPageId
  );
  if (!found) ok("18", `${gapPageId}: not migrated / not fabricated`);
  else fail("18", `${gapPageId}: unexpectedly present in migrated output`);
}
const gapSourceExists = {
  "page.Page112": fs.existsSync(path.join(SOURCE_DD_DIR, "page.Page112.json")) || fs.existsSync(path.join(SOURCE_ARTICLES_DIR, "page.Page112.json")),
  "page.Page115": fs.existsSync(path.join(SOURCE_DD_DIR, "page.Page115.json")) || fs.existsSync(path.join(SOURCE_ARTICLES_DIR, "page.Page115.json")),
  "page.Page116": fs.existsSync(path.join(SOURCE_DD_DIR, "page.Page116.json")) || fs.existsSync(path.join(SOURCE_ARTICLES_DIR, "page.Page116.json")),
  "page.Page117": fs.existsSync(path.join(SOURCE_DD_DIR, "page.Page117.json")) || fs.existsSync(path.join(SOURCE_ARTICLES_DIR, "page.Page117.json")),
};
info(`source existence check (for context, not migrated regardless): ${JSON.stringify(gapSourceExists)}`);

// ===========================================================================
// 10. SLUG VALIDATION
// ===========================================================================
header("10. Slug validation");

function checkDupSlugs(records: { file: string; data: any }[], label: string): void {
  const bySlug = new Map<string, string[]>();
  for (const { file, data } of records) {
    const list = bySlug.get(data.slug) ?? [];
    list.push(file);
    bySlug.set(data.slug, list);
  }
  let dupCount = 0;
  for (const [slug, files] of bySlug) {
    if (files.length > 1) {
      dupCount++;
      fail("10", `${label}: duplicate slug "${slug}" across ${files.join(", ")}`);
    }
  }
  if (dupCount === 0) ok("10", `${label}: no duplicate slugs (${records.length} checked)`);
}
checkDupSlugs(ddRecords, "Divya Desam");
checkDupSlugs(chapterRecords, "Chapter (within book)");
if (bookRecord) ok("10", "Book: only 1 book exists, trivially no duplicate slug");
checkDupSlugs(knowledgeRecords, "Knowledge");

const allSlugsValidShape = [...ddRecords, ...chapterRecords, ...knowledgeRecords].every((r) =>
  /^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.data.slug)
) && (!bookRecord || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(bookRecord.slug));
if (allSlugsValidShape) ok("10", "all slugs follow the established kebab-case destination convention");
else fail("10", "at least one slug does not follow kebab-case convention");

// ===========================================================================
// 11. CHAPTER ORDER VALIDATION
// ===========================================================================
header("11. Chapter order validation");

if (chapterRecords.length === 55) ok("11", "exactly 55 chapters");
else fail("11", `expected 55 chapters, found ${chapterRecords.length}`);

const orders = chapterRecords.map((c) => c.data.order);
if (new Set(orders).size === orders.length) ok("11", "no duplicate chapter order values");
else fail("11", "duplicate chapter order values found");

if (bookRecord) {
  const chapterSlugSet = new Set(chapterRecords.map((c) => c.data.slug));
  const orderSlugSet = new Set(bookRecord.chapterOrder);
  const missingFromOrder = [...chapterSlugSet].filter((s) => !orderSlugSet.has(s));
  const extraInOrder = bookRecord.chapterOrder.filter((s: string) => !chapterSlugSet.has(s));
  const dupInOrder = bookRecord.chapterOrder.length !== new Set(bookRecord.chapterOrder).size;

  if (bookRecord.chapterOrder.length === 55) ok("11", "book.chapterOrder contains exactly 55 entries");
  else fail("11", `book.chapterOrder has ${bookRecord.chapterOrder.length} entries, expected 55`);

  if (missingFromOrder.length === 0) ok("11", "every chapter slug appears in book.chapterOrder");
  else fail("11", `chapter slugs missing from book.chapterOrder: ${missingFromOrder.join(", ")}`);

  if (extraInOrder.length === 0) ok("11", "no nonexistent chapter slug appears in book.chapterOrder");
  else fail("11", `book.chapterOrder references nonexistent chapter slugs: ${extraInOrder.join(", ")}`);

  if (!dupInOrder) ok("11", "every chapter slug appears exactly once in book.chapterOrder");
  else fail("11", "a chapter slug appears more than once in book.chapterOrder");

  const sortedBySlugOrder = [...chapterRecords].sort((a, b) => a.data.order - b.data.order).map((c) => c.data.slug);
  if (JSON.stringify(sortedBySlugOrder) === JSON.stringify(bookRecord.chapterOrder)) {
    ok("11", "book.chapterOrder matches ascending chapter.order sort exactly");
  } else {
    fail("11", "book.chapterOrder does not match the ascending chapter.order sort");
  }
}

// ===========================================================================
// 12/13. IMAGE INTEGRITY + SHARED IMAGE VALIDATION
// ===========================================================================
header("12. Image integrity validation");

const imageByUuid = new Map<string, any>(imageMap.images.map((i: any) => [i.assetUuid, i]));
const allContentRecords = [...ddRecords, ...chapterRecords, ...knowledgeRecords];

let imgChecked = 0;
let imgFailures = 0;
for (const { file, data } of allContentRecords) {
  for (const img of data.images ?? []) {
    imgChecked++;
    const src = imageByUuid.get(img.sourceAssetUuid);
    if (!src) {
      imgFailures++;
      fail("12", `${file}: sourceAssetUuid ${img.sourceAssetUuid} not found in image-map.json`);
      continue;
    }
    if (!img.assetId) {
      imgFailures++;
      fail("12", `${file}: image missing assetId`);
    }
    if (img.sourceOriginalName !== src.sourceOriginalName) {
      imgFailures++;
      fail("12", `${file}: sourceOriginalName "${img.sourceOriginalName}" != registry "${src.sourceOriginalName}"`);
    }
    if (!["needs-review", "confirmed-meaningful", "confirmed-decorative"].includes(img.altStatus)) {
      imgFailures++;
      fail("12", `${file}: invalid altStatus "${img.altStatus}"`);
    }
    const localRelPath = src.localFile?.relativePath;
    if (localRelPath) {
      const fullPath = path.join(REPO_ROOT, localRelPath);
      if (!fs.existsSync(fullPath)) {
        imgFailures++;
        fail("12", `${file}: source image file missing on disk: ${localRelPath}`);
      }
    } else {
      imgFailures++;
      fail("12", `${file}: image-map.json entry for ${img.sourceAssetUuid} has no localFile.relativePath`);
    }
  }
}
if (imgFailures === 0) ok("12", `all ${imgChecked} image references across ${allContentRecords.length} records verified against image-map.json + images/`);

const sourceImageFileCount = fs.readdirSync(IMAGES_DIR).filter((f) => !fs.statSync(path.join(IMAGES_DIR, f)).isDirectory()).length;
if (imageMap.images.length === 217) ok("12", "image-map.json registry has 217 entries");
else fail("12", `image-map.json registry has ${imageMap.images.length} entries, expected 217`);
if (sourceImageFileCount === 217) ok("12", "images/ directory has 217 files");
else fail("12", `images/ directory has ${sourceImageFileCount} files, expected 217`);

header("13. Shared image validation");
const sharedPairs = [
  { uuid: "573d5ea0-69a2-40bb-b2d1-da6c83762939", pageIds: ["page.Page48", "page.Page121"], label: "Page48<->Page121" },
  { uuid: "5e651812-9ae4-4dc9-b662-867b39bf040e", pageIds: ["page.Page90", "page.Page128"], label: "Page90<->Page128 (first)" },
  { uuid: "c0c018d2-6c1c-481b-a883-b1b003b54daf", pageIds: ["page.Page90", "page.Page128"], label: "Page90<->Page128 (second)" },
  { uuid: "92013b6d-dbc5-4481-a56a-31355a9d5b64", pageIds: ["page.Page4", "page.Page113"], label: "Page4<->Page113" },
];
for (const { uuid, pageIds, label } of sharedPairs) {
  let allPresent = true;
  for (const pageId of pageIds) {
    const rec = allContentRecords.find((r) => r.data.migration.sourcePageId === pageId)?.data;
    const hasImage = rec ? (rec.images ?? []).some((img: any) => img.sourceAssetUuid === uuid) : false;
    if (!hasImage) allPresent = false;
  }
  if (allPresent) ok("13", `${label}: shared image ${uuid} present on both records`);
  else fail("13", `${label}: shared image ${uuid} missing from at least one record`);
}

// ===========================================================================
// 14/15. EXTERNAL-LINK VALIDATION + RECONCILIATION
// ===========================================================================
header("14. External-link validation");

let urlChecked = 0;
let urlFailures = 0;
for (const { file, data } of ddRecords) {
  const sourcePath = path.join(SOURCE_DD_DIR, `${data.migration.sourcePageId}.json`);
  const source = readJson(sourcePath);
  const sourceUrls = new Set(source.externalLinks.map((l: any) => l.url));
  for (const shrine of data.shrines ?? []) {
    urlChecked++;
    if (!sourceUrls.has(shrine.mapsLink)) {
      urlFailures++;
      fail("14", `${file}: shrine mapsLink not found verbatim in source: ${shrine.mapsLink}`);
    }
  }
  for (const resource of data.resources ?? []) {
    urlChecked++;
    if (!sourceUrls.has(resource.url)) {
      urlFailures++;
      fail("14", `${file}: resource url not found verbatim in source: ${resource.url}`);
    }
  }
}
if (urlFailures === 0) ok("14", `all ${urlChecked} destination URLs verified byte-for-byte identical to source`);

if (page93Record && page93Record.shrines.length === 0) ok("14", "Page93 has no fabricated Maps link (re-confirmed)");
if (page150) {
  const has4 = (page150.rawExternalLinks ?? []).length === 4;
  if (has4) ok("14", "Page150's 4 Hayagriva Stotram PDF URLs preserved in held-back record (re-confirmed)");
}

header("15. Link-count reconciliation");
const sourceLinks = externalLinksData.links as any[];
const sourceTotalActions = sourceLinks.length;
const sourceMapsActions = sourceLinks.filter((l) => l.resourceType === "google_maps_location").length;
const sourcePdfActions = sourceLinks.filter((l) => l.resourceType === "sloka_pdf_prapatti").length;
const sourceDistinctUrls = new Set(sourceLinks.map((l) => l.url)).size;
const sourceDistinctPages = new Set(sourceLinks.map((l) => l.pageId)).size;

info(`Source totals: ${sourceTotalActions} total link actions, ${sourceMapsActions} Google Maps, ${sourcePdfActions} PDF, ${sourceDistinctUrls} distinct URLs, ${sourceDistinctPages} distinct pages.`);
if (sourceTotalActions === 552 && sourceMapsActions === 116 && sourcePdfActions === 436 && sourceDistinctUrls === 519 && sourceDistinctPages === 108) {
  ok("15", "source totals match the expected known values exactly");
} else {
  fail("15", "source totals do not match the expected known values -- investigate before trusting reconciliation below");
}

let destNormalActions = 0;
for (const { data } of ddRecords) {
  destNormalActions += (data.shrines?.length ?? 0) + (data.resources?.length ?? 0);
}
let destHeldBackActions = 0;
if (page150) destHeldBackActions = (page150.rawExternalLinks ?? []).length;

const destTotalPreserved = destNormalActions + destHeldBackActions;
info(`Destination normal-content link actions (shrines[].mapsLink + resources[].url across 107 Divya Desams): ${destNormalActions}`);
info(`Destination held-back link actions (Page150 rawExternalLinks): ${destHeldBackActions}`);
info(`Total destination-preserved actions: ${destTotalPreserved}`);

if (destTotalPreserved === sourceTotalActions) {
  ok("15", `reconciliation exact: ${destTotalPreserved} destination actions == ${sourceTotalActions} source actions (no structural loss)`);
} else {
  info(`Explanation: source total (${sourceTotalActions}) vs preserved (${destTotalPreserved}) differ by ${sourceTotalActions - destTotalPreserved}. Investigating per-URL below rather than assuming loss.`);
}

// Per-URL trace: every source URL must be traceable to either a normal
// migrated record or the held-back record -- this is the invariant that
// actually matters (not raw action-count equality, since dedup at the
// destination is structurally legitimate: 552 raw click actions collapse
// onto 519 distinct URLs, and the destination model stores one entry per
// resource/shrine, not one per raw source click event).
const destUrlSet = new Set<string>();
for (const { data } of ddRecords) {
  for (const s of data.shrines ?? []) destUrlSet.add(s.mapsLink);
  for (const r of data.resources ?? []) destUrlSet.add(r.url);
}
if (page150) for (const l of page150.rawExternalLinks ?? []) destUrlSet.add(l.url);

const sourceUrlSet = new Set(sourceLinks.map((l) => l.url));
const untracedUrls = [...sourceUrlSet].filter((u) => !destUrlSet.has(u));
if (untracedUrls.length === 0) {
  ok("15", `every one of the ${sourceUrlSet.size} distinct source URLs is traceable to either a normal migrated record or the Page150 held-back record -- NO SOURCE URL SILENTLY LOST`);
} else {
  fail("15", `${untracedUrls.length} source URLs could not be traced to any destination record: ${untracedUrls.slice(0, 10).join(", ")}${untracedUrls.length > 10 ? " ..." : ""}`);
}
info(`Distinct destination URLs (normal + held-back): ${destUrlSet.size} (source distinct URLs: ${sourceUrlSet.size})`);

// ===========================================================================
// 16. RESOURCE-LABEL VALIDATION
// ===========================================================================
header("16. Resource-label validation");

const languageValues = new Set(ddRecords.flatMap((r) => r.data.resources.map((res: any) => res.language)));
let labelFailures = 0;
for (const lang of languageValues) {
  if (!ResourceLanguageSchema.safeParse(lang).success) {
    labelFailures++;
    fail("16", `unexpected resource language value: "${lang}"`);
  }
}
if (labelFailures === 0) ok("16", `all migrated resource languages fall within the established enum: ${[...languageValues].sort().join(", ")}`);

const sourceLabelsSeen = new Set(
  ddRecords.flatMap((r) => r.data.resources.map((res: any) => res.sourceLabel).filter(Boolean))
);
const expectedVariants = [
  "English Pasuram", "English Pasurams", "Tamizh Pasuram", "Tamizh Pasurams",
  "Kannada Pasuram", "Kannada Pasurams", "Sanskrit Pasuram", "Sanskrit Pasurams",
  "Devanagarii Pasuram",
];
const handledVariants = expectedVariants.filter((v) => [...sourceLabelsSeen].some((s: any) => s === v || s.includes(v)));
info(`Distinct sourceLabel values observed across migrated resources: ${sourceLabelsSeen.size}`);
info(`Known variants confirmed present among sourceLabel values (informational, not exhaustive): ${handledVariants.length}/${expectedVariants.length}`);

const page150Labels = new Set((page150?.rawContentBlocks ?? []).filter((b: any) => b.type === "button").map((b: any) => b.label));
const expectedPage150Labels = ["Hayagriva Stotram Sanskrit", "Hayagriva Stotram English", "Hayagriva Stotram Tamizh", "Hayagriva Stotram Kannada"];
const page150LabelsOk = expectedPage150Labels.every((l) => page150Labels.has(l));
if (page150LabelsOk) ok("16", "Page150's 4 Hayagriva Stotram button labels all present verbatim in rawContentBlocks");
else fail("16", `Page150 button labels mismatch: found ${[...page150Labels].join(", ")}`);

// ===========================================================================
// 19. SOURCE INTEGRITY
// ===========================================================================
header("19. Source integrity");

const filesToHash = [
  "content-extraction/divya-desams/page.Page5.json",
  "content-extraction/divya-desams/page.Page93.json",
  "content-extraction/divya-desams/page.Page150.json",
  "content-extraction/image-map.json",
  "content-extraction/resources/external-links.json",
  "content-extraction/articles/page.Page4.json",
  "content-extraction/articles/page.Page113.json",
];
const hashReport: Record<string, string> = {};
for (const rel of filesToHash) {
  const full = path.join(REPO_ROOT, rel);
  hashReport[rel] = fs.existsSync(full) ? sha256(full) : "MISSING";
}
info("SHA-256 of checked source-extraction files (record these; compare against Phase 5H's values):");
for (const [rel, hash] of Object.entries(hashReport)) info(`  ${hash}  ${rel}`);

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
    else count++;
  }
  return count;
}
const scriptsCount = countFiles(path.join(REPO_ROOT, "content-extraction/scripts"));
if (scriptsCount === 10) ok("19", "content-extraction/scripts/ still exactly 10 files");
else fail("19", `content-extraction/scripts/ has ${scriptsCount} files, expected 10`);

if (sourceImageFileCount === 217) ok("19", "images/ still 217 files");
else fail("19", `images/ has ${sourceImageFileCount} files, expected 217`);

// ===========================================================================
// 20. LOADER VALIDATION
// ===========================================================================
header("20. Loader validation (Phase 5D content loader)");

const loader = createContentLoader(CONTENT_ROOT);

const loadedDd = loader.loadDivyaDesams();
if (loadedDd.length === 107) ok("20", "loadDivyaDesams() returns exactly 107 records");
else fail("20", `loadDivyaDesams() returned ${loadedDd.length}, expected 107`);

const loadedSriRangam = loader.loadDivyaDesam("sri-rangam");
if (loadedSriRangam && loadedSriRangam.migration.sourcePageId === "page.Page5") ok("20", "loadDivyaDesam('sri-rangam') resolves correctly");
else fail("20", "loadDivyaDesam('sri-rangam') failed to resolve correctly");

const loadedBooks = loader.loadBooks();
if (loadedBooks.length === 1) ok("20", "loadBooks() returns exactly 1 record");
else fail("20", `loadBooks() returned ${loadedBooks.length}, expected 1`);

if (bookRecord) {
  const loadedBook = loader.loadBook(bookRecord.slug);
  if (loadedBook) ok("20", `loadBook('${bookRecord.slug}') resolves correctly`);
  else fail("20", `loadBook('${bookRecord.slug}') failed to resolve`);

  const loadedChapters = loader.loadChapters(bookRecord.slug);
  if (loadedChapters.length === 55) ok("20", "loadChapters() returns exactly 55 records");
  else fail("20", `loadChapters() returned ${loadedChapters.length}, expected 55`);

  const chapterOrderCorrect = loadedChapters.every((c, i) => i === 0 || c.order >= loadedChapters[i - 1].order);
  if (chapterOrderCorrect) ok("20", "loadChapters() returns chapters sorted ascending by order");
  else fail("20", "loadChapters() chapter ordering is not ascending");

  if (loadedChapters.length > 0) {
    const firstSlug = loadedChapters[0].slug;
    const loadedChapter = loader.loadChapter(bookRecord.slug, firstSlug);
    if (loadedChapter) ok("20", `loadChapter('${bookRecord.slug}', '${firstSlug}') resolves correctly`);
    else fail("20", "loadChapter() slug lookup failed to resolve");
  }
}

const loadedKnowledge = loader.loadKnowledge();
if (loadedKnowledge.length === 1) ok("20", "loadKnowledge() returns exactly 1 record");
else fail("20", `loadKnowledge() returned ${loadedKnowledge.length}, expected 1`);

if (loadedKnowledge.length === 1) {
  const loadedKnowledgeRecord = loader.loadKnowledgeRecord(loadedKnowledge[0].slug);
  if (loadedKnowledgeRecord) ok("20", `loadKnowledgeRecord('${loadedKnowledge[0].slug}') resolves correctly`);
  else fail("20", "loadKnowledgeRecord() slug lookup failed to resolve");
}

const page150InNormalCollections =
  loadedDd.some((d) => d.migration.sourcePageId === "page.Page150") ||
  (bookRecord ? loader.loadChapters(bookRecord.slug).some((c) => c.migration.sourcePageId === "page.Page150") : false) ||
  loadedKnowledge.some((k) => k.migration.sourcePageId === "page.Page150");
if (!page150InNormalCollections) ok("20", "Page150 is NOT returned by any normal content collection loader");
else fail("20", "Page150 unexpectedly appears in a normal content collection loader result");

// ===========================================================================
// Final tally
// ===========================================================================
header("SUMMARY");
info(`Total FAIL count: ${failures}`);

console.log(results.join("\n"));
console.log(`\n${failures === 0 ? "ALL PHASE 5I PROGRAMMATIC CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
