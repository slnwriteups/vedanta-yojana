import { extractPdfPages, flattenPages } from "./pdf-text.ts";

/**
 * Phase 6E, Part 6 -- chapter-boundary detection for "A Brief Insight to
 * Visishtadvaita Philosophy.pdf".
 *
 * The book has a clean "Foreword" section followed by 14 numbered
 * chapters ("1. Tattvas" through "14. Conclusion"). A naive regex for
 * "^N. Title" also matches numbered LIST ITEMS inside chapter bodies
 * (e.g. "1. Aakiaazhwaan's mother is not childless." -- an in-chapter
 * enumerated argument, not a chapter heading), so real chapter headers
 * are identified by requiring BOTH: (a) the chapter number is exactly
 * one more than the previous chapter's number, starting at 1 (a real
 * table of contents is strictly sequential; a chapter body's own
 * internal list numbering is not -- it restarts inside almost every
 * chapter), and (b) the title contains no colon and is under 65
 * characters. (b) exists because one specific 18-item in-chapter list
 * ("8. Raga-Dveshathikal Tholaindha pin Varum: A student must not...")
 * happens to be numbered sequentially continuing from where the real
 * chapters left off, which (a) alone does not reject -- every real
 * chapter title is a short phrase with no colon (longest real title is
 * 61 characters); every item in that specific false-positive list is a
 * "Label: explanation" sentence of 69+ characters.
 */

const CHAPTER_HEADER_PATTERN = /^\s*(\d{1,2})\.\s+(.+?)\s*$/;
const MAX_CHAPTER_TITLE_LENGTH = 65;

export interface VisishtadvaitaChapter {
  order: number;
  title: string;
  startPage: number;
  text: string;
}

export interface VisishtadvaitaBookStructure {
  foreword: { startPage: number; text: string } | null;
  chapters: VisishtadvaitaChapter[];
}

export function parseVisishtadvaitaBook(pdfPath: string): VisishtadvaitaBookStructure {
  const flat = flattenPages(extractPdfPages(pdfPath));

  let forewordIdx = -1;
  flat.forEach((line, idx) => {
    if (forewordIdx === -1 && line.text.trim() === "Foreword") forewordIdx = idx;
  });

  const chapterStarts: { order: number; title: string; idx: number; page: number }[] = [];
  let expectedNext = 1;
  flat.forEach((line, idx) => {
    const m = line.text.match(CHAPTER_HEADER_PATTERN);
    if (!m) return;
    const num = Number(m[1]);
    const title = m[2].trim();
    if (num !== expectedNext) return;
    if (title.includes(":") || title.length > MAX_CHAPTER_TITLE_LENGTH) return;
    chapterStarts.push({ order: num, title, idx, page: flat[idx].page });
    expectedNext += 1;
  });

  const chapters: VisishtadvaitaChapter[] = chapterStarts.map((chapterStart, i) => {
    const endIdx = i + 1 < chapterStarts.length ? chapterStarts[i + 1].idx : flat.length;
    const text = flat
      .slice(chapterStart.idx, endIdx)
      .map((l) => l.text)
      .join("\n");
    return { order: chapterStart.order, title: chapterStart.title, startPage: chapterStart.page, text };
  });

  let foreword: VisishtadvaitaBookStructure["foreword"] = null;
  if (forewordIdx !== -1) {
    const endIdx = chapterStarts.length > 0 ? chapterStarts[0].idx : flat.length;
    const text = flat
      .slice(forewordIdx, endIdx)
      .map((l) => l.text)
      .join("\n");
    foreword = { startPage: flat[forewordIdx].page, text };
  }

  return { foreword, chapters };
}
