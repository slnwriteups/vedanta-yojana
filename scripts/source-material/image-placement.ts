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

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function normalizeForAnchorMatch(s: string): string {
  return collapseWhitespace(s).toLowerCase();
}

/**
 * Finds short "heading-like" LINES within one content-extraction text
 * block, to use as anchor points for an image that immediately follows
 * it -- e.g. a record with several named sub-shrines/legends
 * (Singavelkundram/Ahobilam's nine Narasimha forms, Tirudwarkai's Beyt/
 * Dakor/Shrinathji sub-temples) where each photo illustrates ONE named
 * sub-section, not the record's Sthala Puranam as a whole.
 *
 * Works at LINE granularity (single `\n`), not paragraph granularity
 * (`\n{2,}`): verified against real data that these sub-headings are
 * NOT always isolated by a blank line from their own following
 * paragraph (Tirudwarkai's "Beyt Dwarka:" sits on its own single-newline
 * line, immediately followed by that sub-temple's prose on the very
 * next line, both inside what LongFormSection's `\n{2,}` split treats as
 * ONE paragraph) -- so line-level matching is required to find them at
 * all, and the renderer (below) knows how to split a rendered paragraph
 * at a matched line rather than only between paragraphs.
 *
 * Two heading shapes, both verified against real data:
 * 1. ALL-CAPS, optionally numbered: "1. BHARGAVA NARASIMHA SWAMY",
 *    "UGRA STHAMBHAM".
 * 2. Title Case ending in a colon: "Beyt Dwarka:", "Rukmini Dwarka:".
 * Takes the LAST matching line in the block (closest to the image that
 * follows it).
 */
function extractHeadingAnchor(blockContent: string): string | null {
  const lines = blockContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const allCaps = /^(\d{1,2}\.\s*)?[A-Z][A-Z\s()'-]{3,60}$/;
  // Title Case, every word capitalized (a name, not a sentence fragment
  // that merely happens to end in a colon, e.g. "...is as follows:").
  const colonHeading = /^(?:[A-Z][a-z'’]*\s*){1,6}:$/;

  let last: string | null = null;
  for (const line of lines) {
    if (line.length <= 60 && (allCaps.test(line) || colonHeading.test(line))) {
      last = line;
    }
  }
  if (last) return last;

  // Fall back to the whole block, when it's short enough to BE the
  // heading itself (e.g. "Sri Andal Nachiyar", "Mahendragiri", "Varaha
  // Swamy" each sit alone in their own block with no colon/caps).
  // Capped at 5 words, not just 100 characters: a genuine heading is a
  // short name/noun phrase, distinct from an equally-short but
  // sentence-shaped photo CAPTION (verified against a real false
  // positive: "Periya Azhwar being taken on the royal procession and
  // seeing the Lord and Mahalakshmi" is 87 characters but a 15-word
  // sentence describing a specific photo, not a section heading a
  // DIFFERENT photo should anchor to).
  const collapsed = collapseWhitespace(blockContent);
  const wordCount = collapsed.split(" ").filter(Boolean).length;
  return collapsed.length > 0 && collapsed.length <= 100 && wordCount <= 5 ? collapsed : null;
}

/**
 * Returns a Map<sourceAssetUuid, lineText> for original SAP images that
 * should render immediately after a SPECIFIC line within `sthalaPuranam`
 * (rather than generically "after the whole thing"). `lineText` is
 * copied VERBATIM from a real line in `sthalaPuranam` (found via
 * normalized exact match against the candidate heading) -- guaranteed to
 * locate correctly at render time since it's the same string, not a
 * reconstruction. Images whose preceding block yields no confident
 * heading, or whose heading can't be located verbatim in
 * `sthalaPuranam` (e.g. a genuine spelling difference between the
 * frozen source and the migrated field, confirmed for one Singavelkundram/
 * Ahobilam sub-heading), are simply absent from the result -- they keep
 * the existing coarse "after Sthala Puranam" bucket behavior, never a
 * regression, only an upgrade where confident.
 */
export function computeImageAnchors(
  contentExtractionDir: string,
  sourcePageId: string,
  sthalaPuranam: string | undefined
): Map<string, string> {
  const result = new Map<string, string>();
  if (!sthalaPuranam) return result;

  const srcPath = path.join(contentExtractionDir, `${sourcePageId}.json`);
  if (!fs.existsSync(srcPath)) return result;

  const src = JSON.parse(fs.readFileSync(srcPath, "utf8")) as { contentBlocks: ContentBlock[] };
  const blocks = [...(src.contentBlocks ?? [])].sort((a, b) => a.order - b.order);

  const sthalaLines = sthalaPuranam.split("\n");
  const normalizedLines = sthalaLines.map(normalizeForAnchorMatch);

  // Never scan back further than the block that starts Sthala Puranam
  // itself -- a natural, principled lower bound (matches the "after
  // Sthala Puranam" scope this whole module already establishes), so a
  // heading search can never wander into the unrelated Temple
  // Information/Maps-buttons blocks earlier on the page.
  const sthalaStartPrefix = normalizeForAnchorMatch(sthalaPuranam.slice(0, 30));
  const sthalaBlock = blocks.find(
    (b) => b.type === "text" && b.content && normalizeForAnchorMatch(b.content).includes(sthalaStartPrefix)
  );
  const lowerBoundOrder = sthalaBlock?.order ?? -Infinity;

  for (const block of blocks) {
    if (block.type !== "picture" || !block.imageAssetRef) continue;

    // Scan backward through EVERY preceding block (text or picture) down
    // to lowerBoundOrder, not just the immediately-adjacent one -- a
    // heading can sit one or more blocks further back than a caption,
    // intervening paragraph, or a PRIOR picture in the same 2-photo
    // group (verified: Srivilliputtur's "Sri Andal Nachiyar" heading
    // precedes a full paragraph about her, then the photo that
    // illustrates the whole section; Singavelkundram/Ahobilam's "7.
    // MALOLA NARASIMHA SWAMY" has two consecutive photos, and the
    // second one's own immediately-preceding block is the FIRST photo,
    // not the heading). Deliberately does NOT stop at a picture block --
    // the exact-line-match against sthalaPuranam below is already a
    // strong enough filter against picking up an unrelated heading.
    let heading: string | null = null;
    for (let i = blocks.length - 1; i >= 0; i--) {
      const candidate = blocks[i];
      if (candidate.order >= block.order || candidate.order < lowerBoundOrder) continue;
      if (candidate.type !== "text" || !candidate.content) continue;
      heading = extractHeadingAnchor(candidate.content);
      if (heading) break;
    }
    if (!heading) continue;

    const normalizedHeading = normalizeForAnchorMatch(heading);
    const idx = normalizedLines.findIndex((l) => l === normalizedHeading);
    if (idx === -1) continue;

    result.set(block.imageAssetRef.replace("ag-asset://", ""), sthalaLines[idx]);
  }

  return result;
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
