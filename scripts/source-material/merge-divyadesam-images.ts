import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseDivyaDesamBook, type DivyaDesamBookEntry } from "./divyadesam-entries.ts";
import { extractAllImages, isContentPhoto, isQrCode, decodeQrCode, type ExtractedImage } from "./divyadesam-images.ts";
import { loadDivyaDesams } from "../../content-lib/loader/index.ts";
import { DivyaDesamSchema, type ImageEntry, type Shrine } from "../../content-lib/schemas/index.ts";

/**
 * Phase 6E, Part 5 -- associates the book's per-temple content:
 *
 * 1. Genuine photos (non-square embedded images) -> new ImageEntry
 *    objects appended to the matched record's `images[]`.
 * 2. The per-page QR code (square embedded image, present on almost
 *    every page) -> decoded via `zbarimg` into its real Google Maps URL
 *    and, when the existing record has NO shrines yet, added as a new
 *    Shrine (`{ label: null, mapsLink }`) -- the exact shape single-
 *    shrine records already use. When the record ALREADY has a
 *    shrine/mapsLink, the QR-derived link is NOT compared for equality
 *    (two differently-formatted Google Maps URLs can point at the same
 *    coordinates with no reliable offline way to tell -- geocoding them
 *    would be a network call, which this phase must not introduce) and
 *    is instead written to the review report as an informational note
 *    for a human to check, never silently added as a possible duplicate
 *    or silently discarded.
 *
 * Only single-entry, unambiguous records are touched -- multi-shrine
 * records already excluded from the text-field merge (Part 4) are
 * skipped here too, since a page's image/QR cannot be confidently
 * attributed to one specific sub-shrine.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PDF_PATH = path.join(REPO_ROOT, "source-material/Books/108 Divyadesam 2nd Edition.pdf");
const DIVYA_DESAMS_DIR = path.join(REPO_ROOT, "content/divya-desams");
const PROVENANCE_DIR = path.join(REPO_ROOT, "content/_provenance/divya-desams");
const PUBLIC_IMAGES_DIR = path.join(REPO_ROOT, "public/images");
const REPORT_PATH = path.join(REPO_ROOT, "source-material/reports/phase-6E-maps-review.md");
const SOURCE_FILE = "108 Divyadesam 2nd Edition.pdf";

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

interface ProvenanceEntry {
  field: string;
  value: string;
  sourceFile: string;
  sourcePage: number;
  sourceSection: string;
  importedAt: string;
  note?: string;
}

export function runImageAndMapsMerge(): {
  updatedSlugs: string[];
  totalImagesAdded: number;
  totalShrinesAdded: number;
  mapsReviewItems: { slug: string; page: number; existingLinks: string[]; qrLink: string }[];
} {
  const bookEntries = parseDivyaDesamBook(PDF_PATH);
  const existingRecords = loadDivyaDesams();

  const byNormTitle = new Map<string, DivyaDesamBookEntry[]>();
  for (const entry of bookEntries) {
    const key = normalizeTitle(entry.title);
    const list = byNormTitle.get(key) ?? [];
    list.push(entry);
    byNormTitle.set(key, list);
  }

  const sortedByPage = [...bookEntries].sort((a, b) => a.startPage - b.startPage);

  const tmpDir = fs.mkdtempSync(path.join(REPO_ROOT, ".tmp-divyadesam-images-"));
  let extracted: ExtractedImage[];
  try {
    extracted = extractAllImages(PDF_PATH, tmpDir);
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }

  const byPage = new Map<number, ExtractedImage[]>();
  for (const img of extracted) {
    const list = byPage.get(img.page) ?? [];
    list.push(img);
    byPage.set(img.page, list);
  }

  /**
   * The page-range upper bound for the LAST book entry (by page number)
   * has no "next entry" to stop at. Using Infinity here previously caused
   * a genuine infinite loop for whichever entry happens to be last (page
   * 357, "Tiruparamapadam (Sri Vaikuntham)") -- `for (p = 357; p <
   * Infinity; p++)` never terminates. The real document has a finite
   * page count, so the highest page number among the embedded images
   * (the only thing this loop ever looks up) is a safe, always-correct
   * upper bound.
   */
  const maxDocumentPage = Math.max(...extracted.map((img) => img.page));

  fs.mkdirSync(PROVENANCE_DIR, { recursive: true });
  const importedAt = new Date().toISOString().slice(0, 10);

  const updatedSlugs: string[] = [];
  let totalImagesAdded = 0;
  let totalShrinesAdded = 0;
  const mapsReviewItems: { slug: string; page: number; existingLinks: string[]; qrLink: string }[] = [];

  try {
    for (const record of existingRecords) {
      const entries = byNormTitle.get(normalizeTitle(record.displayName));
      if (!entries || entries.length !== 1) continue; // multi-shrine / unmatched -- skip, per Part 5

      const entry = entries[0];
      const sortedIdx = sortedByPage.findIndex((e) => e === entry);
      const rangeEnd =
        sortedIdx + 1 < sortedByPage.length ? sortedByPage[sortedIdx + 1].startPage : maxDocumentPage + 1;

      const candidateImages: ExtractedImage[] = [];
      for (let p = entry.startPage; p < rangeEnd; p++) {
        candidateImages.push(...(byPage.get(p) ?? []));
      }
      if (candidateImages.length === 0) continue;

      const newImageEntries: ImageEntry[] = [];
      const newShrines: Shrine[] = [];
      const provenance: ProvenanceEntry[] = [];
      let sequence = record.images.length + 1;

      for (const img of candidateImages) {
        if (isContentPhoto(img)) {
          const uuid = crypto.randomUUID();
          fs.copyFileSync(img.filePath, path.join(PUBLIC_IMAGES_DIR, `${uuid}.png`));
          const assetId = `${record.slug}-book-${sequence}`;
          sequence += 1;
          newImageEntries.push({
            assetId,
            sourceAssetUuid: uuid,
            sourceOriginalName: `108-divyadesam-book-page${img.page}-img${img.index}.png (synthetic name -- the source PDF has no embedded per-image filename)`,
            alt: null,
            altStatus: "needs-review",
          });
          provenance.push({
            field: "images",
            value: assetId,
            sourceFile: SOURCE_FILE,
            sourcePage: img.page,
            sourceSection: entry.title,
            importedAt,
            note: "Selected because it is not square (excludes this book's per-page QR code) and not the page-1 cover.",
          });
        } else if (isQrCode(img)) {
          const decoded = decodeQrCode(img.filePath);
          if (!decoded) continue;
          if (record.shrines.length === 0) {
            newShrines.push({ label: null, mapsLink: decoded });
            provenance.push({
              field: "shrines",
              value: decoded,
              sourceFile: SOURCE_FILE,
              sourcePage: img.page,
              sourceSection: entry.title,
              importedAt,
              note: "Decoded from this book's per-page QR code (zbarimg); record had no existing shrines/mapsLink.",
            });
          } else {
            mapsReviewItems.push({
              slug: record.slug,
              page: img.page,
              existingLinks: record.shrines.map((s) => s.mapsLink),
              qrLink: decoded,
            });
          }
        }
      }

      if (newImageEntries.length === 0 && newShrines.length === 0) continue;

      const filePath = path.join(DIVYA_DESAMS_DIR, `${record.slug}.json`);
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      raw.images = [...raw.images, ...newImageEntries];
      raw.shrines = [...raw.shrines, ...newShrines];

      const result = DivyaDesamSchema.safeParse(raw);
      if (!result.success) {
        throw new Error(`Adding book images/shrines to "${record.slug}" would fail DivyaDesamSchema validation: ${result.error.message}`);
      }
      fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + "\n", "utf8");

      const provenancePath = path.join(PROVENANCE_DIR, `${record.slug}.json`);
      const existingProvenance = fs.existsSync(provenancePath) ? JSON.parse(fs.readFileSync(provenancePath, "utf8")) : [];
      fs.writeFileSync(provenancePath, JSON.stringify([...existingProvenance, ...provenance], null, 2) + "\n", "utf8");

      updatedSlugs.push(record.slug);
      totalImagesAdded += newImageEntries.length;
      totalShrinesAdded += newShrines.length;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return { updatedSlugs, totalImagesAdded, totalShrinesAdded, mapsReviewItems };
}

function writeMapsReviewReport(items: { slug: string; page: number; existingLinks: string[]; qrLink: string }[]) {
  const lines = [
    "# Phase 6E — Maps QR code review",
    "",
    "For these records, the existing record already has at least one shrine/mapsLink, and this book's per-page QR code decoded to a Google Maps URL. The two links were NOT compared for equivalence (different Maps URL formats can point at the identical coordinates with no reliable offline way to tell -- doing so would require a network geocoding call, which this phase must not introduce). Neither link was modified; check manually whether the QR link is the same place, a more specific/different entrance, or a genuinely different location.",
    "",
    "| Divya Desam | Book page | Existing mapsLink(s) | QR-decoded link |",
    "|---|---|---|---|",
    ...items.map((i) => `| \`${i.slug}\` | ${i.page} | ${i.existingLinks.join("<br>") || "_(none)_"} | ${i.qrLink} |`),
    "",
  ];
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join("\n") + "\n", "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { updatedSlugs, totalImagesAdded, totalShrinesAdded, mapsReviewItems } = runImageAndMapsMerge();
  console.log(`Added ${totalImagesAdded} image(s) and ${totalShrinesAdded} new shrine(s) across ${updatedSlugs.length} record(s).`);
  for (const slug of updatedSlugs) console.log(`  - ${slug}`);
  console.log(`Maps links needing human review (existing shrine already present): ${mapsReviewItems.length}`);
  writeMapsReviewReport(mapsReviewItems);
  console.log(`Wrote ${path.relative(REPO_ROOT, REPORT_PATH)}`);
}
