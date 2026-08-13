import { extractPdfPages, flattenPages, type PdfLine } from "./pdf-text.ts";

/**
 * Phase 6E -- entry-boundary detection for "108 Divyadesam 2nd Edition.pdf".
 *
 * Primary anchor: a line matching DETAILS_MARKER_PATTERN. Inspection of
 * every entry found five real spellings in the source: "Details of
 * Kshethram:" (100 entries), "Details of the Kshethram:" (1), "Details
 * of Kshetham:" (1, a source typo -- preserved as-is, not "corrected"),
 * and "Details of Kshethram" with no trailing colon (3) -- all matched
 * by one tolerant regex. One entry (101, Tiruchalagramam/Mukthinath) has
 * no marker line at all and is picked up by a second pass anchored
 * directly on "Moolavar:" for any such line not already covered by a
 * marker-anchored entry's own text range.
 *
 * The temple title is the nearest non-blank line preceding the anchor.
 * This is deliberately NOT also asked to skip over prose paragraphs
 * (an earlier version of this script anchored on "Moolavar:" for every
 * entry and needed to; that version mis-captured titles whenever a
 * marker was followed by explanatory prose before the actual Moolavar/
 * Thayaar fields, e.g. Tirunangur's 11-temple explanation) -- anchoring
 * on the marker line itself keeps the title immediately adjacent in
 * every real case observed.
 */

const MANUAL_TITLE_OVERRIDES: Record<string, string> = {
  "67": "Tanjai Mamanikoyil", // page-number line intervenes between the title and the marker; multi-shrine group (also contains Manikkunram, Thanjaiyazhinagar, all under this one marker block)
  Tirumanikoodam: "Tiruttetriambalam Tirumanikoodam", // real title "36,37) Tiruttetriambalam\nTirumanikoodam" wraps across a page break; only the second line survives as the "nearest preceding" capture
  "131": "Tirukachchi (Hasthigiri)", // title "43)Tirukachchi (Hasthigiri)" sits on the page BEFORE the marker's page, with only a page-number line between them
  "7) Tirukkadigai": "Tirunindravur", // this specific occurrence is item 7 of a REGIONAL TOC-preview list (items 1-7, Tirunindravur..Tirukkadigai); the entry itself has no individual title line of its own -- identified instead via its sthalaPuranam text ("hence the name Triu Ninravoor")
  "(Tirukatkarai)": "Tirukakkarai (Tirukatkarai)", // title wraps across two lines: "67) Tirukakkarai" / "(Tirukatkarai)"
  "(Vanamamalai / Nanguneri)": "Tiruchireevaramangai (Vanamamalai / Nanguneri)", // title wraps: "79) Tiruchireevaramangai" / "(Vanamamalai / Nanguneri)"
  Srivaikuntam: "Tiruvaikuntam / Srivaikuntam", // title wraps: "108 Divyadesam – 80) Tiruvaikuntam /" / "Srivaikuntam"
  Devapiran: "Tirutholaivillimangalam", // "Devapiran" is the Moolavar name bleeding into the title-search zone; real title "83) Tirutholaivillimangalam" is one page earlier
  "Guptar Ghat on the banks of Saryu River where Sri Ramar ascended towards Paramapadam":
    "Tiruayodhi (Ayodhya)", // this is an image caption sitting between the real title "96) Tiruayodhi (Ayodhya)" and the marker
  "Vrindavan)": "Tiruvadamadurai (Mathura and Vrindavan)", // title wraps: "102) Tiruvadamadurai (Mathura and" / "Vrindavan)"
  "Sri Nand Yashodha Bhavan": "Tiruvaipadi (Gokulam)", // Krishna-childhood-in-Gokulam content identifies this uniquely; captured line is a photo caption, not the title
  "( Sholingapuram / Gadikachalam )": "Tirukkadigai (Sholingapuram / Gadikachalam)", // title wraps: "64) Tirukkadigai" / "( Sholingapuram / Gadikachalam )"
};

const DETAILS_MARKER_PATTERN = /^Details of (the )?Kshet[h]?[r]?am:?$/i;

/**
 * Verified (by reading the surrounding text directly) to have NO
 * "Details of ... Kshethram" marker line at all -- title, then straight
 * into "Moolavar:". Without special-casing this, the marker-anchored
 * entry immediately before it would swallow its text into its OWN block
 * (its [markerIdx, nextMarkerIdx) range has nothing to stop at), which
 * would corrupt that PRECEDING entry too (a second, unexpected
 * "Moolavar:" appearing inside it triggers parseTempleDetails's
 * AmbiguousLabelError for the wrong record). Each title string here is
 * used to force a hard entry boundary regardless of marker positions.
 */
const MARKERLESS_ENTRY_TITLES = ["101) Tiruchalagramam (Mukthinath)"];

export interface DivyaDesamBookEntry {
  rawCapturedTitle: string;
  title: string;
  titleOverridden: boolean;
  startPage: number;
  text: string;
}

function findTitleAbove(flat: { page: number; text: string }[], idx: number): string {
  let j = idx - 1;
  while (j >= 0) {
    const candidate = flat[j].text.trim();
    if (candidate) return candidate;
    j -= 1;
  }
  return "";
}

/** Same search as findTitleAbove, but returns the line's INDEX rather than its text. */
function findTitleAboveIndex(flat: { page: number; text: string }[], idx: number): number | null {
  let j = idx - 1;
  while (j >= 0) {
    if (flat[j].text.trim()) return j;
    j -= 1;
  }
  return null;
}

export function parseDivyaDesamBook(pdfPath: string): DivyaDesamBookEntry[] {
  const flat = flattenPages(extractPdfPages(pdfPath));

  // Entry-start anchors are marker lines PLUS any known markerless title
  // line, merged into one sorted boundary list so no entry's range can
  // ever run past a markerless entry's own start.
  const markerIndexes: number[] = [];
  flat.forEach((line, index) => {
    if (DETAILS_MARKER_PATTERN.test(line.text.trim())) markerIndexes.push(index);
  });

  const markerlessTitleIndexes: number[] = [];
  flat.forEach((line, index) => {
    if (MARKERLESS_ENTRY_TITLES.includes(line.text.trim())) markerlessTitleIndexes.push(index);
  });

  const boundaries = [...markerIndexes, ...markerlessTitleIndexes].sort((a, b) => a - b);
  const markerlessSet = new Set(markerlessTitleIndexes);

  return boundaries.map((idx, k) => {
    const endIdx = k + 1 < boundaries.length ? boundaries[k + 1] : flat.length;
    const isMarkerless = markerlessSet.has(idx);

    // A markerless boundary IS the title line itself; a normal marker
    // boundary needs the title searched above it.
    const rawCapturedTitle = isMarkerless ? flat[idx].text.trim() : findTitleAbove(flat, idx);
    const override = MANUAL_TITLE_OVERRIDES[rawCapturedTitle];
    const title = override ?? rawCapturedTitle;

    // The NEXT entry's own title line (the nearest non-blank line above
    // its marker) sits INSIDE [idx, endIdx) by construction -- endIdx is
    // the next marker's own index, not the title above it. Left
    // untrimmed, every entry's text ends with the following entry's
    // title bleeding in (confirmed in real migrated output: e.g.
    // Singavelkundram/Ahobilam's sthalaPuranam ending "...Ugra
    // Sthambham.'\n\n\n\n\n\n106) Tiruvenkatam"). Trimmed here for a
    // markered next boundary; a markerless next boundary IS already the
    // title itself, so there's nothing extra to exclude.
    let textEndIdx = endIdx;
    if (endIdx < flat.length && !markerlessSet.has(endIdx)) {
      const nextTitleIdx = findTitleAboveIndex(flat, endIdx);
      if (nextTitleIdx !== null && nextTitleIdx >= idx) {
        textEndIdx = nextTitleIdx;
      }
    }

    const text = flat
      .slice(idx, textEndIdx)
      .map((l: PdfLine) => l.text)
      .join("\n");

    return { rawCapturedTitle, title, titleOverridden: Boolean(override), startPage: flat[idx].page, text };
  });
}
