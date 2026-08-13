import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runComparison, type RecordClassification } from "./extract-divyadesam-book.ts";
import { DivyaDesamSchema } from "../../content-lib/schemas/index.ts";

/**
 * Phase 6E, Part 4/5 -- the ONLY script in this phase that writes to
 * content/. Re-runs the same classification extract-divyadesam-book.ts
 * produces and applies EXACTLY the category-B fields (existing value
 * absent, source value present, no ambiguity) -- never a C or D field,
 * never anything from a multi-entry/ambiguous-group record. Also writes
 * one provenance record per merged fact to content/_provenance/
 * divya-desams/ (Part 3's traceability model: a plain, new, non-loaded
 * companion directory -- content-lib/schemas/ and content-lib/loader/
 * are untouched, and the loader never looks inside content/_provenance/,
 * mirroring the existing content/_unresolved/ precedent for a
 * loader-invisible sidecar directory under content/).
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIVYA_DESAMS_DIR = path.join(REPO_ROOT, "content/divya-desams");
const PROVENANCE_DIR = path.join(REPO_ROOT, "content/_provenance/divya-desams");
const SOURCE_FILE = "108 Divyadesam 2nd Edition.pdf";

const TEMPLE_INFO_FIELDS = new Set(["moolavar", "thayaar", "vimanam", "theertham", "travelNote"]);

interface ProvenanceEntry {
  field: string;
  value: string;
  sourceFile: string;
  sourcePage: number;
  sourceSection: string;
  importedAt: string;
}

function mergeRecord(classification: RecordClassification, importedAt: string): ProvenanceEntry[] {
  const filePath = path.join(DIVYA_DESAMS_DIR, `${classification.slug}.json`);
  const raw = fs.readFileSync(filePath, "utf8");
  const record = JSON.parse(raw);

  const provenance: ProvenanceEntry[] = [];

  for (const field of classification.fields) {
    if (field.category !== "B" || !field.sourceValue) continue;

    if (TEMPLE_INFO_FIELDS.has(field.field)) {
      record.templeInformation[field.field] = field.sourceValue;
    } else {
      record[field.field] = field.sourceValue;
    }

    provenance.push({
      field: TEMPLE_INFO_FIELDS.has(field.field) ? `templeInformation.${field.field}` : field.field,
      value: field.sourceValue,
      sourceFile: SOURCE_FILE,
      sourcePage: classification.bookPage,
      sourceSection: classification.bookTitle,
      importedAt,
    });
  }

  if (provenance.length > 0) {
    // Safety check reusing the real, unmodified schema: the merged
    // record must still validate before it is ever written to disk.
    const result = DivyaDesamSchema.safeParse(record);
    if (!result.success) {
      throw new Error(
        `Merging category-B facts into "${classification.slug}" would produce a record that fails DivyaDesamSchema validation: ${result.error.message}`
      );
    }
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2) + "\n", "utf8");
  }

  return provenance;
}

export function runMerge(): { mergedSlugs: string[]; totalFactsMerged: number } {
  const { classifications } = runComparison();
  const importedAt = new Date().toISOString().slice(0, 10);

  fs.mkdirSync(PROVENANCE_DIR, { recursive: true });

  const mergedSlugs: string[] = [];
  let totalFactsMerged = 0;

  for (const classification of classifications) {
    const provenance = mergeRecord(classification, importedAt);
    if (provenance.length === 0) continue;

    mergedSlugs.push(classification.slug);
    totalFactsMerged += provenance.length;

    const provenancePath = path.join(PROVENANCE_DIR, `${classification.slug}.json`);
    fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2) + "\n", "utf8");
  }

  return { mergedSlugs, totalFactsMerged };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { mergedSlugs, totalFactsMerged } = runMerge();
  console.log(`Merged ${totalFactsMerged} category-B fact(s) into ${mergedSlugs.length} record(s):`);
  for (const slug of mergedSlugs) console.log(`  - ${slug}`);
}
