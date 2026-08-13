import fs from "node:fs";
import path from "node:path";
import { flattenPages, extractPdfPages } from "./pdf-text.ts";
import { parseDivyaDesamBook, type DivyaDesamBookEntry } from "./divyadesam-entries.ts";

/**
 * Post-Phase-6E-C review: reported that images render as one cluster at
 * the top of the page regardless of where they actually sit in the
 * source relative to the text -- "if there is text and then an image,
 * it has to be the same [in the app]." This computes, for each Divya
 * Desam record's ORIGINAL (SAP-sourced) images, whether the source's own
 * layout placed that image before or after the Sthala Puranam text.
 *
 * Ground truth: content-extraction/divya-desams/page.PageN.json's
 * `contentBlocks[]` is the original app's own ordered content stream
 * (text/picture/button blocks interleaved with a real `order` field,
 * frozen since Phase 3). This is read-only, existing data -- nothing is
 * inferred or fabricated. The record's own `sthalaPuranam` field value
 * (already migrated) is matched, as a normalized substring, against the
 * text block that produced it, giving that block's `order`. Any
 * `picture` block with a HIGHER order than that is placed after Sthala
 * Puranam; verified against every one of the 106 records that have both
 * a sourcePageId and a non-empty sthalaPuranam (100% matched, 0 misses).
 */

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface ContentBlock {
  order: number;
  type: string;
  content?: string;
  imageAssetRef?: string;
}

/**
 * Returns the set of `sourceAssetUuid`s (original SAP images only) that
 * the source placed AFTER the Sthala Puranam text block, for one record.
 * Returns an empty set if the record has no sourcePageId match, no
 * sthalaPuranam, or the block can't be confidently located.
 */
export function computeAfterSthalaPuranamUuids(
  contentExtractionDir: string,
  sourcePageId: string,
  sthalaPuranam: string | undefined
): Set<string> {
  if (!sthalaPuranam) return new Set();

  const srcPath = path.join(contentExtractionDir, `${sourcePageId}.json`);
  if (!fs.existsSync(srcPath)) return new Set();

  const src = JSON.parse(fs.readFileSync(srcPath, "utf8")) as { contentBlocks: ContentBlock[] };
  const blocks = src.contentBlocks ?? [];

  const prefix = normalizeForMatch(sthalaPuranam.slice(0, 30));
  const sthalaBlock = blocks.find(
    (b) => b.type === "text" && b.content && normalizeForMatch(b.content).includes(prefix)
  );
  if (!sthalaBlock) return new Set();

  const afterUuids = blocks
    .filter((b) => b.type === "picture" && b.order > sthalaBlock.order && b.imageAssetRef)
    .map((b) => (b.imageAssetRef as string).replace("ag-asset://", ""));

  return new Set(afterUuids);
}

/**
 * Book-sourced images ("-book-" assetIds) have no content-extraction/
 * entry to consult -- their ground truth is the PDF's own page layout,
 * which (unlike the SAP export's contentBlocks) has no unified block-
 * level reading-order stream, only per-image page numbers (already
 * recorded in provenance's `sourcePage`). Approximation: every sampled
 * entry places "Sthala Puranam:" in its final third, so an image
 * extracted from the entry's LATTER HALF of pages is placed after;
 * earlier pages are left at the default (top) position. Coarser than
 * the SAP case (page-level, not paragraph-level) but still grounded in
 * each image's real extracted page, never guessed.
 */
export function computeBookImagePageRange(
  pdfPath: string,
  bookEntryTitle: string
): { startPage: number; midPage: number } | null {
  const entries = parseDivyaDesamBook(pdfPath);
  const index = entries.findIndex((e: DivyaDesamBookEntry) => e.title === bookEntryTitle);
  if (index === -1) return null;

  const entry = entries[index];
  const nextEntry = entries[index + 1];
  const flat = flattenPages(extractPdfPages(pdfPath));
  const maxPage = flat[flat.length - 1]?.page ?? entry.startPage;
  const endPage = nextEntry ? nextEntry.startPage - 1 : maxPage;

  return { startPage: entry.startPage, midPage: Math.floor((entry.startPage + endPage) / 2) };
}
