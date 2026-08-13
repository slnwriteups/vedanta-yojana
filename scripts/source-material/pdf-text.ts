import { execFileSync } from "node:child_process";

/**
 * Phase 6E -- thin wrapper around poppler's `pdftotext -layout`, the only
 * external tool this import tooling depends on. Layout mode preserves
 * the source's line/column structure closely enough for the label-based
 * "Details of Kshethram:" parser (reused from scripts/migration/
 * text-parser.ts) to work unchanged. Not used by the app itself, only by
 * this one-off source-material import tooling.
 */
export interface PdfPage {
  pageNumber: number;
  lines: string[];
}

export function extractPdfPages(pdfPath: string): PdfPage[] {
  let raw: string;
  try {
    raw = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 64,
    });
  } catch (cause) {
    throw new Error(
      `Failed to run "pdftotext -layout" on "${pdfPath}". This tool requires poppler-utils installed locally (e.g. "brew install poppler"). Original error: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
  }

  // pdftotext emits one form-feed (\x0c) between pages.
  const rawPages = raw.split("\x0c");
  return rawPages.map((pageText, index) => ({
    pageNumber: index + 1,
    lines: pageText.split("\n").filter((line) => !isPageFooterNumber(line)),
  }));
}

/**
 * Every page in this book ends with its own printed page number sitting
 * alone on a line. `-layout` mode preserves it as ordinary body text, so
 * without filtering it out, a footer number that happens to land between
 * two recognized labels (e.g. between "Travel: ..." and the next
 * "Azhwar Pashuram:") gets captured as part of the preceding field's
 * value by parseTempleDetails -- confirmed by inspection: several
 * `travelNote` values came back with a trailing stray page number.
 * Filtering strictly on "the entire trimmed line is 1-4 digits, nothing
 * else" cannot remove genuine content -- no source sentence in this book
 * is ever a bare number alone on its own line.
 */
function isPageFooterNumber(line: string): boolean {
  return /^\s*\d{1,4}\s*$/.test(line);
}

/** Flattened (pageNumber, line) pairs -- convenient for marker/boundary scanning across page breaks. */
export interface PdfLine {
  page: number;
  text: string;
}

export function flattenPages(pages: PdfPage[]): PdfLine[] {
  const flat: PdfLine[] = [];
  for (const page of pages) {
    for (const line of page.lines) {
      flat.push({ page: page.pageNumber, text: line });
    }
  }
  return flat;
}
