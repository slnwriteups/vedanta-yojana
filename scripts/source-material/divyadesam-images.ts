import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Phase 6E, Part 5 -- inventories the embedded raster images in "108
 * Divyadesam 2nd Edition.pdf" via poppler's `pdfimages -list`/`-png`.
 *
 * Every page in this book embeds (at minimum) two images: one genuine
 * photo of the deity/temple, and one square QR code (linking to that
 * temple's Google Maps location). Visually inspected several of each
 * (see the Phase 6E report) to confirm this holds: every QR code
 * sampled is exactly square (width === height) and decodes to a real
 * maps.google.com URL via `zbarimg`; every genuine photo sampled is not
 * square. Page 1's large image is the book cover, excluded by page
 * number rather than shape.
 *
 * Extraction is done ONCE for the entire document (`extractAllImages`),
 * not once per page -- an earlier version of this script shelled out to
 * `pdfimages` per candidate page (~150 separate subprocess invocations,
 * each re-opening and re-parsing the full 35MB/360-page PDF from
 * scratch) and was too slow to finish in reasonable time. A single
 * whole-document `pdfimages -png` call produces sequentially-numbered
 * files (prefix-000.png, prefix-001.png, ...) in the EXACT same order
 * as `pdfimages -list`'s own output (verified empirically: extracting
 * pages 10-15 alone produces 3 files whose byte sizes match, in order,
 * the 3 entries `-list` reports for those same pages) -- so the two
 * outputs can be zipped together by position instead of correlated by
 * page-by-page subprocess calls.
 */

export interface EmbeddedImage {
  page: number;
  index: number;
  width: number;
  height: number;
}

export function listEmbeddedImages(pdfPath: string): EmbeddedImage[] {
  const raw = execFileSync("pdfimages", ["-list", pdfPath], { encoding: "utf8", maxBuffer: 1024 * 1024 * 16 });
  const lines = raw.split("\n").slice(2); // skip the two header lines
  const images: EmbeddedImage[] = [];
  for (const line of lines) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5) continue;
    const [pageStr, indexStr, , widthStr, heightStr] = cols;
    const page = Number(pageStr);
    const index = Number(indexStr);
    const width = Number(widthStr);
    const height = Number(heightStr);
    if (Number.isNaN(page) || Number.isNaN(index) || Number.isNaN(width) || Number.isNaN(height)) continue;
    images.push({ page, index, width, height });
  }
  return images;
}

export function isContentPhoto(image: EmbeddedImage): boolean {
  if (image.page === 1) return false; // book cover
  if (image.width === image.height) return false; // QR code
  if (image.width < 100 || image.height < 100) return false; // decorative icon/rule, not a photo
  return true;
}

export function isQrCode(image: EmbeddedImage): boolean {
  return image.page !== 1 && image.width === image.height && image.width >= 100;
}

/** One entry per embedded image, in the same order as listEmbeddedImages, each paired with its extracted PNG file path. */
export interface ExtractedImage extends EmbeddedImage {
  filePath: string;
}

export function extractAllImages(pdfPath: string, outDir: string): ExtractedImage[] {
  const metadata = listEmbeddedImages(pdfPath);
  const prefix = path.join(outDir, "img");
  execFileSync("pdfimages", ["-png", pdfPath, prefix], { encoding: "utf8", maxBuffer: 1024 * 1024 * 16 });

  const files = fs
    .readdirSync(outDir)
    .filter((name) => name.startsWith("img-"))
    .sort();

  if (files.length !== metadata.length) {
    throw new Error(
      `pdfimages extracted ${files.length} files but "-list" reported ${metadata.length} images -- the positional pairing this script relies on cannot be trusted. Aborting rather than risk mis-associating an image with the wrong page.`
    );
  }

  return metadata.map((img, i) => ({ ...img, filePath: path.join(outDir, files[i]) }));
}

/** Decodes a QR code image via `zbarimg`. Returns null if no barcode is found (never throws for that case). */
export function decodeQrCode(filePath: string): string | null {
  try {
    const raw = execFileSync("zbarimg", ["--raw", "-q", filePath], { encoding: "utf8" });
    const value = raw.trim();
    return value.length > 0 ? value : null;
  } catch (err) {
    // zbarimg exits non-zero when it finds no barcode in the image -- not an error condition here.
    return null;
  }
}
