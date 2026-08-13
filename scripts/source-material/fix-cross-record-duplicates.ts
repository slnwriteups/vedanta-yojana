import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDivyaDesamBook, type DivyaDesamBookEntry } from "./divyadesam-entries.ts";
import { DUPLICATE_RMSE_THRESHOLD } from "./duplicate-images.ts";
import { execFileSync } from "node:child_process";
import { DivyaDesamSchema } from "../../content-lib/schemas/index.ts";

/**
 * Second post-Phase-6E-C review finding: "some pictures are showing up
 * in a few temples from the next listing." Root cause: the original
 * Phase 6E image-merge script (merge-divyadesam-images.ts) assigned
 * every embedded image on pages [entry.startPage, nextEntry.startPage)
 * to the CURRENT temple. The book's actual layout sometimes puts the
 * NEXT temple's own intro photo on a page before that next temple's own
 * "Details of Kshethram:" marker (its detected startPage) -- so that
 * photo's page still falls inside the CURRENT temple's computed range
 * and gets wrongly attributed there.
 *
 * Detection: for every pair of book-adjacent entries (sorted by page),
 * compare EVERY book-sourced image on one side against EVERY image
 * (original or book) on the other side, via the same perceptual RMSE
 * check used for the within-record duplicate fix. A cross-record match
 * below threshold means the "book" copy was extracted from a page that
 * actually shows the OTHER temple -- removed from wherever it
 * currently sits (its neighbor's copy, or its neighbor's already-
 * migrated original, is kept).
 *
 * Deliberately scoped to IMMEDIATE neighbors only (not all 107x106
 * pairs): misattribution only happens at a shared page boundary, and
 * checking only adjacent entries keeps this fast and avoids flagging
 * unrelated temples that simply look visually similar.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIVYA_DESAMS_DIR = path.join(REPO_ROOT, "content/divya-desams");
const PROVENANCE_DIR = path.join(REPO_ROOT, "content/_provenance/divya-desams");
const PUBLIC_IMAGES_DIR = path.join(REPO_ROOT, "public/images");
const PDF_PATH = path.join(REPO_ROOT, "source-material/Books/108 Divyadesam 2nd Edition.pdf");
const REPORT_PATH = path.join(REPO_ROOT, "source-material/reports/phase-6E-cross-record-duplicates-report.md");

interface ImageEntry {
  assetId: string;
  sourceAssetUuid: string;
  [key: string]: unknown;
}

function findImageFile(uuid: string): string | null {
  const entries = fs.readdirSync(PUBLIC_IMAGES_DIR);
  const match = entries.find((f) => f.startsWith(`${uuid}.`));
  return match ? path.join(PUBLIC_IMAGES_DIR, match) : null;
}

function rmseDistance(fileA: string, fileB: string): number | null {
  try {
    execFileSync(
      "compare",
      ["-metric", "RMSE", "-colorspace", "Gray", "-resize", "64x64!", fileA, fileB, "null:"],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    return 0;
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString() ?? "";
    const match = stderr.match(/\(([\d.]+)\)/);
    return match ? parseFloat(match[1]) : null;
  }
}

function loadRecord(slug: string): any {
  return JSON.parse(fs.readFileSync(path.join(DIVYA_DESAMS_DIR, `${slug}.json`), "utf8"));
}

function writeRecord(slug: string, record: unknown) {
  const result = DivyaDesamSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Refusing to write ${slug}.json: fails DivyaDesamSchema validation -- ${result.error.message}`);
  }
  fs.writeFileSync(path.join(DIVYA_DESAMS_DIR, `${slug}.json`), JSON.stringify(record, null, 2) + "\n", "utf8");
}

function loadProvenance(slug: string): any[] {
  const file = path.join(PROVENANCE_DIR, `${slug}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
}

function writeProvenance(slug: string, entries: any[]) {
  const file = path.join(PROVENANCE_DIR, `${slug}.json`);
  if (entries.length === 0) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  fs.writeFileSync(file, JSON.stringify(entries, null, 2) + "\n", "utf8");
}

function deleteImageFile(uuid: string) {
  const entries = fs.readdirSync(PUBLIC_IMAGES_DIR);
  const match = entries.find((f) => f.startsWith(`${uuid}.`));
  if (match) fs.unlinkSync(path.join(PUBLIC_IMAGES_DIR, match));
}

const COMBINING_DIACRITICAL_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function normalizeTitle(title: string): string {
  return title
    .replace(/^\s*\(?\d+(?:,\s*\d+)*\)?[.,)]\s*/, "")
    .normalize("NFD")
    .replace(COMBINING_DIACRITICAL_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface RemovalRecord {
  fromSlug: string;
  removedAssetId: string;
  keptInSlug: string;
  keptAssetId: string;
  rmse: number;
}

function run() {
  const bookEntries = parseDivyaDesamBook(PDF_PATH);
  const sorted = [...bookEntries].sort((a, b) => a.startPage - b.startPage);

  const files = fs.readdirSync(DIVYA_DESAMS_DIR).filter((f) => f.endsWith(".json"));
  const slugByNormTitle = new Map<string, string>();
  for (const file of files) {
    const record = loadRecord(file.replace(".json", ""));
    slugByNormTitle.set(normalizeTitle(record.displayName), record.slug);
  }

  function entryToSlug(entry: DivyaDesamBookEntry): string | undefined {
    return slugByNormTitle.get(normalizeTitle(entry.title));
  }

  const removals: RemovalRecord[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const curSlug = entryToSlug(sorted[i]);
    const nextSlug = entryToSlug(sorted[i + 1]);
    if (!curSlug || !nextSlug || curSlug === nextSlug) continue;

    const curRecord = loadRecord(curSlug);
    const nextRecord = loadRecord(nextSlug);

    const curBookImages: ImageEntry[] = (curRecord.images ?? []).filter((img: ImageEntry) =>
      img.assetId.includes("-book-")
    );
    const nextBookImages: ImageEntry[] = (nextRecord.images ?? []).filter((img: ImageEntry) =>
      img.assetId.includes("-book-")
    );

    // Direction 1: does curRecord have a book image that actually belongs to nextRecord?
    for (const curImg of curBookImages) {
      const f1 = findImageFile(curImg.sourceAssetUuid);
      if (!f1) continue;
      for (const nextImg of nextRecord.images ?? []) {
        if (nextImg.assetId === curImg.assetId) continue;
        const f2 = findImageFile(nextImg.sourceAssetUuid);
        if (!f2) continue;
        const rmse = rmseDistance(f1, f2);
        if (rmse !== null && rmse < DUPLICATE_RMSE_THRESHOLD) {
          removals.push({ fromSlug: curSlug, removedAssetId: curImg.assetId, keptInSlug: nextSlug, keptAssetId: nextImg.assetId, rmse });
          break;
        }
      }
    }

    // Direction 2: does nextRecord have a book image that actually belongs to curRecord?
    for (const nextImg of nextBookImages) {
      const f1 = findImageFile(nextImg.sourceAssetUuid);
      if (!f1) continue;
      for (const curImg of curRecord.images ?? []) {
        if (curImg.assetId === nextImg.assetId) continue;
        const f2 = findImageFile(curImg.sourceAssetUuid);
        if (!f2) continue;
        const rmse = rmseDistance(f1, f2);
        if (rmse !== null && rmse < DUPLICATE_RMSE_THRESHOLD) {
          removals.push({ fromSlug: nextSlug, removedAssetId: nextImg.assetId, keptInSlug: curSlug, keptAssetId: curImg.assetId, rmse });
          break;
        }
      }
    }
  }

  // Apply removals, grouped by the record they're removed FROM.
  const removalsBySlug = new Map<string, RemovalRecord[]>();
  for (const r of removals) {
    const list = removalsBySlug.get(r.fromSlug) ?? [];
    list.push(r);
    removalsBySlug.set(r.fromSlug, list);
  }

  for (const [slug, recs] of removalsBySlug) {
    const record = loadRecord(slug);
    const removeIds = new Set(recs.map((r) => r.removedAssetId));
    const removedImages = (record.images ?? []).filter((img: ImageEntry) => removeIds.has(img.assetId));
    record.images = (record.images ?? []).filter((img: ImageEntry) => !removeIds.has(img.assetId));

    for (const img of removedImages) deleteImageFile(img.sourceAssetUuid);

    const provenance = loadProvenance(slug).filter((p) => !(p.field === "images" && removeIds.has(p.value)));
    writeProvenance(slug, provenance);
    writeRecord(slug, record);
  }

  const reportLines = [
    "# Phase 6E-C follow-up: cross-record (adjacent-temple) duplicate images",
    "",
    "Generated by `scripts/source-material/fix-cross-record-duplicates.ts` in response to:",
    '"Some pictures are showing up in a few temples from the next listing."',
    "",
    "Root cause: merge-divyadesam-images.ts (Phase 6E) assigned every embedded image on a temple's",
    "computed page range to that temple. The book's layout sometimes places the NEXT temple's own",
    "intro photo on a page still inside the CURRENT temple's range, before the next temple's own",
    '"Details of Kshethram:" marker -- misattributing that photo. Detected via the same perceptual',
    "RMSE check as the within-record duplicate fix, applied to adjacent book entries only.",
    "",
    `## Images reassigned by removal (${removals.length})`,
    "",
    "| Removed from | Removed image | Belongs to (kept there) | Matched image | RMSE |",
    "|---|---|---|---|---|",
    ...removals.map(
      (r) => `| ${r.fromSlug} | ${r.removedAssetId} | ${r.keptInSlug} | ${r.keptAssetId} | ${r.rmse.toFixed(4)} |`
    ),
    "",
  ];
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, reportLines.join("\n") + "\n", "utf8");

  console.log(`Removed ${removals.length} cross-record misattributed images across ${removalsBySlug.size} records.`);
  console.log(`Report written to ${path.relative(REPO_ROOT, REPORT_PATH)}`);
}

run();
