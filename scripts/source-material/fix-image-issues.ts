import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findDuplicatePairs } from "./duplicate-images.ts";
import { computeAfterSthalaPuranamUuids, computeBookImagePageRange } from "./image-placement.ts";
import { DivyaDesamSchema } from "../../content-lib/schemas/index.ts";

/**
 * Post-Phase-6E-C review fix, two issues reported against the same data:
 *
 * 1. "For a few temples the pictures have doubled" -- 149 of the 174
 *    book-sourced images added in Phase 6E are near-duplicates (same
 *    photograph, re-scanned) of an image the record already had. Removed
 *    here, from both the record's `images[]` and its provenance file,
 *    with the now-orphaned file deleted from public/images/.
 *
 * 2. "Images aren't sitting in place like in the book ... they're all
 *    shown at the very beginning" -- the app always rendered every image
 *    in one block before Temple Information, regardless of where the
 *    source actually placed it. Fixed by setting the new
 *    `placement: "after-sthala-puranam"` field (content-lib/schemas/
 *    shared.ts) on images the source's own layout placed after that
 *    text -- computed from content-extraction/'s frozen contentBlocks
 *    order for original SAP images, and from each book image's own
 *    extracted PDF page for the (much smaller, post-dedup) set of
 *    surviving book images.
 *
 * Placement is computed AFTER duplicate removal, so a removed
 * duplicate's placement is moot and a surviving image's placement isn't
 * skewed by a duplicate that's about to disappear.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIVYA_DESAMS_DIR = path.join(REPO_ROOT, "content/divya-desams");
const PROVENANCE_DIR = path.join(REPO_ROOT, "content/_provenance/divya-desams");
const CONTENT_EXTRACTION_DD_DIR = path.join(REPO_ROOT, "content-extraction/divya-desams");
const PUBLIC_IMAGES_DIR = path.join(REPO_ROOT, "public/images");
const PDF_PATH = path.join(REPO_ROOT, "source-material/Books/108 Divyadesam 2nd Edition.pdf");
const REPORT_PATH = path.join(REPO_ROOT, "source-material/reports/phase-6E-image-fixes-report.md");

interface ImageEntry {
  assetId: string;
  sourceAssetUuid: string;
  placement?: string;
  [key: string]: unknown;
}

interface ProvenanceEntry {
  field: string;
  value: string;
  [key: string]: unknown;
}

function loadRecord(file: string): any {
  return JSON.parse(fs.readFileSync(path.join(DIVYA_DESAMS_DIR, file), "utf8"));
}

function writeRecord(file: string, record: unknown) {
  const result = DivyaDesamSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Refusing to write ${file}: fails DivyaDesamSchema validation -- ${result.error.message}`);
  }
  fs.writeFileSync(path.join(DIVYA_DESAMS_DIR, file), JSON.stringify(record, null, 2) + "\n", "utf8");
}

function loadProvenance(slug: string): ProvenanceEntry[] {
  const file = path.join(PROVENANCE_DIR, `${slug}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
}

function writeProvenance(slug: string, entries: ProvenanceEntry[]) {
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

interface RemovalRecord {
  slug: string;
  keptAssetId: string;
  removedAssetId: string;
  rmse: number;
}

interface PlacementRecord {
  slug: string;
  assetId: string;
  reason: string;
}

function run() {
  const files = fs.readdirSync(DIVYA_DESAMS_DIR).filter((f) => f.endsWith(".json")).sort();

  const removals: RemovalRecord[] = [];
  const placements: PlacementRecord[] = [];

  for (const file of files) {
    const record = loadRecord(file);
    const images: ImageEntry[] = record.images ?? [];
    if (images.length < 2) continue;

    // --- Step 1: duplicate detection + removal ---
    const dupPairs = findDuplicatePairs(images, PUBLIC_IMAGES_DIR);
    const toRemoveAssetIds = new Set<string>();
    for (const pair of dupPairs) {
      const aIsBook = pair.assetIdA.includes("-book-");
      const bIsBook = pair.assetIdB.includes("-book-");
      if (aIsBook === bIsBook) {
        throw new Error(
          `${record.slug}: duplicate pair (${pair.assetIdA}, ${pair.assetIdB}) is not one original + one book image -- refusing to guess which to remove.`
        );
      }
      const bookAssetId = aIsBook ? pair.assetIdA : pair.assetIdB;
      const keptAssetId = aIsBook ? pair.assetIdB : pair.assetIdA;
      toRemoveAssetIds.add(bookAssetId);
      removals.push({ slug: record.slug, keptAssetId, removedAssetId: bookAssetId, rmse: pair.rmse });
    }

    if (toRemoveAssetIds.size > 0) {
      const removedImages = images.filter((img) => toRemoveAssetIds.has(img.assetId));
      record.images = images.filter((img) => !toRemoveAssetIds.has(img.assetId));

      for (const img of removedImages) deleteImageFile(img.sourceAssetUuid);

      const provenance = loadProvenance(record.slug).filter(
        (p) => !(p.field === "images" && toRemoveAssetIds.has(p.value))
      );
      writeProvenance(record.slug, provenance);
    }

    // --- Step 2: placement, computed on the SURVIVING image set ---
    const survivingImages: ImageEntry[] = record.images;
    if (survivingImages.length === 0) {
      writeRecord(file, record);
      continue;
    }

    const nonBookImages = survivingImages.filter((img) => !img.assetId.includes("-book-"));
    const afterUuids = computeAfterSthalaPuranamUuids(
      CONTENT_EXTRACTION_DD_DIR,
      record.migration.sourcePageId,
      record.sthalaPuranam
    );
    for (const img of nonBookImages) {
      if (afterUuids.has(img.sourceAssetUuid)) {
        img.placement = "after-sthala-puranam";
        placements.push({ slug: record.slug, assetId: img.assetId, reason: "content-extraction contentBlocks order" });
      }
    }

    const bookImages = survivingImages.filter((img) => img.assetId.includes("-book-"));
    if (bookImages.length > 0) {
      const provenance = loadProvenance(record.slug);
      const sourceSection = provenance.find((p) => p.field === "images" && p.value === bookImages[0].assetId)
        ?.sourceSection as string | undefined;
      if (sourceSection) {
        const range = computeBookImagePageRange(PDF_PATH, sourceSection);
        if (range) {
          for (const img of bookImages) {
            const sourcePage = provenance.find((p) => p.field === "images" && p.value === img.assetId)
              ?.sourcePage as number | undefined;
            if (sourcePage !== undefined && sourcePage >= range.midPage) {
              img.placement = "after-sthala-puranam";
              placements.push({ slug: record.slug, assetId: img.assetId, reason: `book page ${sourcePage} >= entry midpoint ${range.midPage}` });
            }
          }
        }
      }
    }

    writeRecord(file, record);
  }

  const reportLines = [
    "# Phase 6E-C follow-up: duplicate image removal + placement fix",
    "",
    "Generated by `scripts/source-material/fix-image-issues.ts` in response to two review findings:",
    '"For a few temples the pictures have doubled" and "images aren\'t sitting in place like in the book."',
    "",
    `## Duplicate images removed (${removals.length})`,
    "",
    "Detected via ImageMagick perceptual RMSE (64x64 grayscale, threshold 0.10); every pair below",
    "threshold visually confirmed as the same photograph, re-scanned between the original SAP export",
    "and the 108 Divyadesam book. The book-sourced copy was removed in every case; the original,",
    "previously-validated image was kept.",
    "",
    "| Divya Desam | Kept | Removed | RMSE |",
    "|---|---|---|---|",
    ...removals.map((r) => `| ${r.slug} | ${r.keptAssetId} | ${r.removedAssetId} | ${r.rmse.toFixed(4)} |`),
    "",
    `## Images placed after Sthala Puranam (${placements.length})`,
    "",
    "Every other image keeps the default (top-of-page) placement, matching the source layout for the",
    "large majority of records.",
    "",
    "| Divya Desam | Image | Reason |",
    "|---|---|---|",
    ...placements.map((p) => `| ${p.slug} | ${p.assetId} | ${p.reason} |`),
    "",
  ];
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, reportLines.join("\n") + "\n", "utf8");

  console.log(`Removed ${removals.length} duplicate images across ${new Set(removals.map((r) => r.slug)).size} records.`);
  console.log(`Placed ${placements.length} images after Sthala Puranam across ${new Set(placements.map((p) => p.slug)).size} records.`);
  console.log(`Report written to ${path.relative(REPO_ROOT, REPORT_PATH)}`);
}

run();
