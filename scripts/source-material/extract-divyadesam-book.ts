import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTempleDetails } from "../migration/text-parser.ts";
import { AmbiguousLabelError } from "../migration/errors.ts";
import { loadDivyaDesams } from "../../content-lib/loader/index.ts";
import type { DivyaDesam } from "../../content-lib/schemas/index.ts";
import { parseDivyaDesamBook, type DivyaDesamBookEntry } from "./divyadesam-entries.ts";
import { normalizeForCompare, shortFieldsEquivalent, longestCommonSubstringRatio } from "./compare.ts";

/**
 * Phase 6E, Part 4 -- compares the 108 Divyadesam book against all 107
 * existing Divya Desam records and classifies every field per the
 * brief's categories A-E. Writes NOTHING by itself in this dry-run/
 * report mode; the actual merge step (only for clean category-B facts)
 * is intentionally a separate, explicit pass -- see merge-divyadesam-
 * book.ts -- so this script can be re-run freely to inspect the
 * classification without risk of touching content/.
 */

/**
 * scripts/migration/text-parser.ts's LABEL_DEFINITIONS recognizes
 * "Azhwar Pasuram:" (matching the original SAP source's spelling) --
 * this book spells the SAME section header "Azhwar Pashuram:" (with an
 * "h") in all 104 occurrences, with zero exceptions (verified by
 * grepping the raw extracted text). Without normalizing this one label
 * string before parsing, that section boundary is never recognized, and
 * its content silently bleeds into the end of the PRECEDING field
 * (travelNote) instead -- confirmed by inspection of several travelNote
 * values coming back with a trailing "Azhwar Pashuram: ... Pashurams"
 * tail. This rewrites only the label text itself, never any field VALUE
 * -- the azhwarPasuram content that follows is still captured and
 * preserved exactly as the book wrote it. Not a source "correction"
 * (fidelity rule 9): this is compensating for a limitation in the reused
 * parser's fixed label list, not altering what the book says.
 */
export function normalizeLabelSpelling(text: string): string {
  return text.replace(/Azhwar Pashuram(\s*:)/gi, "Azhwar Pasuram$1");
}

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PDF_PATH = path.join(REPO_ROOT, "source-material/Books/108 Divyadesam 2nd Edition.pdf");

/**
 * Genuine spelling/transliteration variants between the book and the
 * existing (SAP-sourced) slug's displayName -- NOT a text-extraction
 * boundary bug like the ones in divyadesam-entries.ts's own override
 * table. Each entry verified by reading both titles side by side.
 */
const KNOWN_SPELLING_VARIANTS: Record<string, string> = {
  "tirudwarakai dwaraka": "tirudwarkai dwarka", // book: "Tirudwarakai (Dwaraka)" vs existing: "TiruDwarkai (Dwarka)"
};

function normalizeTitle(title: string): string {
  const stripped = title.replace(/^\s*\(?\d+(?:,\s*\d+)*\)?[.,)]\s*/, "");
  const norm = normalizeForCompare(stripped);
  return KNOWN_SPELLING_VARIANTS[norm] ?? norm;
}

export type FieldCategory = "A" | "B" | "C" | "D" | "E";

export interface FieldClassification {
  field: string;
  category: FieldCategory;
  existingValue: string | undefined;
  sourceValue: string | undefined;
  reason: string;
}

export interface RecordClassification {
  slug: string;
  displayName: string;
  bookTitle: string;
  bookPage: number;
  bookEntryCount: number;
  fields: FieldClassification[];
}

export interface UnmatchedBookEntry {
  title: string;
  page: number;
  rawCapturedTitle: string;
}

export interface UnmatchedExistingRecord {
  slug: string;
  displayName: string;
  sourcePageId: string;
}

function classifyRecord(
  record: DivyaDesam,
  entries: DivyaDesamBookEntry[]
): RecordClassification | { slug: string; displayName: string; ambiguousGroup: true; entryCount: number } {
  // A record matched by MORE than one book entry (e.g. Tanjai Mamanikoyil's
  // 3-shrine group) cannot be safely field-diffed against a single flat
  // templeInformation -- the existing schema has no per-shrine slot. This
  // is a category-D architectural limitation, documented in the review
  // report, not auto-merged under any circumstance.
  if (entries.length > 1) {
    return { slug: record.slug, displayName: record.displayName, ambiguousGroup: true, entryCount: entries.length };
  }

  const entry = entries[0];
  let parsed: ReturnType<typeof parseTempleDetails> | null = null;
  let parseError: string | null = null;
  try {
    parsed = parseTempleDetails(normalizeLabelSpelling(entry.text));
  } catch (err) {
    if (err instanceof AmbiguousLabelError) {
      parseError = err.message;
    } else {
      throw err;
    }
  }

  if (!parsed) {
    return {
      slug: record.slug,
      displayName: record.displayName,
      bookTitle: entry.title,
      bookPage: entry.startPage,
      bookEntryCount: 1,
      fields: [
        {
          field: "(entire entry)",
          category: "D",
          existingValue: undefined,
          sourceValue: undefined,
          reason: `parseTempleDetails could not parse this entry: ${parseError}`,
        },
      ],
    };
  }

  const fields: FieldClassification[] = [];

  function classifyShortField(field: keyof DivyaDesam["templeInformation"]) {
    const existingValue = record.templeInformation[field];
    const sourceValue = parsed!.templeInformation[field];
    if (existingValue && sourceValue) {
      const equivalent = shortFieldsEquivalent(existingValue, sourceValue);
      fields.push({
        field,
        category: equivalent ? "A" : "C",
        existingValue,
        sourceValue,
        reason: equivalent
          ? "already present and materially equivalent"
          : "existing and source values differ materially -- flagged, not auto-merged",
      });
    } else if (!existingValue && sourceValue) {
      fields.push({
        field,
        category: "B",
        existingValue: undefined,
        sourceValue,
        reason: "existing record has no value for this field; source supplies one",
      });
    } else if (existingValue && !sourceValue) {
      fields.push({
        field,
        category: "A",
        existingValue,
        sourceValue: undefined,
        reason: "existing value present, source has none -- existing value kept as-is",
      });
    } else {
      fields.push({
        field,
        category: "E",
        existingValue: undefined,
        sourceValue: undefined,
        reason: "not present in either the existing record or this source",
      });
    }
  }

  (["moolavar", "thayaar", "vimanam", "theertham", "travelNote"] as const).forEach(classifyShortField);

  function classifyLongField(fieldName: "sthalaPuranam" | "azhwarPasuram") {
    const existingValue = record[fieldName];
    const sourceValue = parsed![fieldName];
    if (existingValue && sourceValue) {
      const ratio = longestCommonSubstringRatio(existingValue, sourceValue);
      const category: FieldCategory = ratio > 0.6 ? "A" : "D";
      fields.push({
        field: fieldName,
        category,
        existingValue,
        sourceValue,
        reason:
          category === "A"
            ? `already present; long-form-overlap ratio ${ratio.toFixed(2)} judged materially equivalent`
            : `both sources have a value but they diverge substantially (overlap ratio ${ratio.toFixed(2)}) -- requires human comparison, not auto-merged`,
      });
    } else if (!existingValue && sourceValue) {
      fields.push({
        field: fieldName,
        category: "B",
        existingValue: undefined,
        sourceValue,
        reason: "existing record has no value for this field; source supplies one",
      });
    } else if (existingValue && !sourceValue) {
      fields.push({
        field: fieldName,
        category: "A",
        existingValue,
        sourceValue: undefined,
        reason: "existing value present, source has none -- existing value kept as-is",
      });
    } else {
      fields.push({
        field: fieldName,
        category: "E",
        existingValue: undefined,
        sourceValue: undefined,
        reason: "not present in either the existing record or this source",
      });
    }
  }

  classifyLongField("sthalaPuranam");
  classifyLongField("azhwarPasuram");

  return {
    slug: record.slug,
    displayName: record.displayName,
    bookTitle: entry.title,
    bookPage: entry.startPage,
    bookEntryCount: 1,
    fields,
  };
}

export interface ComparisonResult {
  classifications: RecordClassification[];
  ambiguousGroups: { slug: string; displayName: string; entryCount: number }[];
  unmatchedBookEntries: UnmatchedBookEntry[];
  unmatchedExistingRecords: UnmatchedExistingRecord[];
}

export function runComparison(): ComparisonResult {
  const bookEntries = parseDivyaDesamBook(PDF_PATH);
  const existingRecords = loadDivyaDesams();

  const byNormTitle = new Map<string, DivyaDesamBookEntry[]>();
  for (const entry of bookEntries) {
    const key = normalizeTitle(entry.title);
    const list = byNormTitle.get(key) ?? [];
    list.push(entry);
    byNormTitle.set(key, list);
  }

  const classifications: RecordClassification[] = [];
  const ambiguousGroups: { slug: string; displayName: string; entryCount: number }[] = [];
  const unmatchedExistingRecords: UnmatchedExistingRecord[] = [];
  const consumedKeys = new Set<string>();

  for (const record of existingRecords) {
    const key = normalizeTitle(record.displayName);
    const entries = byNormTitle.get(key);
    if (!entries) {
      unmatchedExistingRecords.push({
        slug: record.slug,
        displayName: record.displayName,
        sourcePageId: record.migration.sourcePageId,
      });
      continue;
    }
    consumedKeys.add(key);
    const result = classifyRecord(record, entries);
    if ("ambiguousGroup" in result) {
      ambiguousGroups.push({ slug: result.slug, displayName: result.displayName, entryCount: result.entryCount });
    } else {
      classifications.push(result);
    }
  }

  const unmatchedBookEntries: UnmatchedBookEntry[] = [];
  for (const [key, entries] of byNormTitle) {
    if (!consumedKeys.has(key)) {
      for (const entry of entries) {
        unmatchedBookEntries.push({ title: entry.title, page: entry.startPage, rawCapturedTitle: entry.rawCapturedTitle });
      }
    }
  }

  return { classifications, ambiguousGroups, unmatchedBookEntries, unmatchedExistingRecords };
}

// Run directly when invoked as a script (not when imported by the merge script).
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runComparison();
  const outPath = path.join(REPO_ROOT, "source-material/reports/divyadesam-comparison.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");

  const categoryTotals: Record<FieldCategory, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const c of result.classifications) {
    for (const f of c.fields) categoryTotals[f.category]++;
  }

  console.log(`Matched ${result.classifications.length} single-entry records, ${result.ambiguousGroups.length} multi-shrine groups (unmergeable without a schema change).`);
  console.log(`Unmatched book entries: ${result.unmatchedBookEntries.length}`);
  for (const e of result.unmatchedBookEntries) console.log(`  - page ${e.page}: "${e.title}" (raw capture: "${e.rawCapturedTitle}")`);
  console.log(`Existing records with no book match: ${result.unmatchedExistingRecords.length}`);
  for (const r of result.unmatchedExistingRecords) console.log(`  - ${r.slug} (${r.displayName}, ${r.sourcePageId})`);
  console.log("Field category totals:", categoryTotals);
  console.log(`Full detail written to ${path.relative(REPO_ROOT, outPath)}`);
}
