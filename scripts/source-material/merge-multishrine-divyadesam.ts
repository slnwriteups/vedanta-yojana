import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseTempleDetails } from "../migration/text-parser.ts";
import { parseDivyaDesamBook, type DivyaDesamBookEntry } from "./divyadesam-entries.ts";
import { normalizeLabelSpelling } from "./extract-divyadesam-book.ts";
import { DivyaDesamSchema } from "../../content-lib/schemas/index.ts";

/**
 * Phase 6E-C -- the two multi-shrine records left unmergeable at the end
 * of Phase 6E (source-material/reports/phase-6E-review-report.md's
 * "Multi-entry / structurally unmergeable records" section): Tanjai
 * Mamanikoyil (3 sub-temples) and Tiruvaali Tirunagari (2 places). Both
 * failed `parseTempleDetails` with `AmbiguousLabelError` because their
 * source text repeats "Moolavar:"/"Thayaar:"/etc. once per shrine within
 * one book entry, and the schema only had one flat `templeInformation`
 * slot per record.
 *
 * This script does NOT modify `scripts/migration/text-parser.ts` (a
 * protected file) or generalize shrine-splitting into it. Instead it
 * manually locates each shrine's own text segment within the one
 * combined book entry (verified by direct inspection of both entries'
 * extracted text -- see the boundary line lists below) and calls the
 * SAME reused `parseTempleDetails` independently on each segment, where
 * it succeeds cleanly because each segment has only one occurrence of
 * every label. This is deliberately record-specific, one-off logic --
 * not a general multi-shrine parser -- because only these two records
 * need it.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PDF_PATH = path.join(REPO_ROOT, "source-material/Books/108 Divyadesam 2nd Edition.pdf");
const DIVYA_DESAMS_DIR = path.join(REPO_ROOT, "content/divya-desams");
const PROVENANCE_DIR = path.join(REPO_ROOT, "content/_provenance/divya-desams");
const SOURCE_FILE = "108 Divyadesam 2nd Edition.pdf";

interface ProvenanceEntry {
  field: string;
  value: string;
  sourceFile: string;
  sourcePage: number;
  sourceSection: string;
  importedAt: string;
  note?: string;
}

interface ShrineSegment {
  /** The shrine's own name, exactly as captured from its boundary line in the source. */
  name: string;
  text: string;
}

function findLineIndex(lines: string[], predicate: (trimmed: string) => boolean, context: string): number {
  const idx = lines.findIndex((l) => predicate(l.trim()));
  if (idx === -1) throw new Error(`${context}: expected boundary line not found`);
  return idx;
}

/**
 * Splits one book entry's text into per-shrine segments plus a trailing
 * "record-level" segment (from the "Travel:" line to the end), given an
 * ordered list of exact shrine-heading lines as they appear in the
 * source (verified by direct inspection, not a generic heuristic).
 */
function splitByHeadingLines(
  entryText: string,
  headingLines: string[],
  context: string
): { shrineSegments: ShrineSegment[]; trailingText: string } {
  const lines = entryText.split("\n");
  const headingIndices = headingLines.map((heading) =>
    findLineIndex(lines, (t) => t === heading, `${context} (heading "${heading}")`)
  );
  const travelIdx = findLineIndex(lines, (t) => t.startsWith("Travel:"), `${context} (Travel: line)`);

  const shrineSegments: ShrineSegment[] = headingIndices.map((start, i) => {
    const end = i + 1 < headingIndices.length ? headingIndices[i + 1] : travelIdx;
    return { name: headingLines[i], text: lines.slice(start, end).join("\n") };
  });
  const trailingText = lines.slice(travelIdx).join("\n");
  return { shrineSegments, trailingText };
}

function parseSegment(rawText: string) {
  return parseTempleDetails(normalizeLabelSpelling(rawText));
}

function findBookEntry(entries: DivyaDesamBookEntry[], title: string): DivyaDesamBookEntry {
  const entry = entries.find((e) => e.title === title);
  if (!entry) throw new Error(`Book entry "${title}" not found`);
  return entry;
}

function loadRecord(slug: string): any {
  const filePath = path.join(DIVYA_DESAMS_DIR, `${slug}.json`);
  return { filePath, record: JSON.parse(fs.readFileSync(filePath, "utf8")) };
}

function writeRecord(filePath: string, record: unknown) {
  const result = DivyaDesamSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Refusing to write ${filePath}: fails DivyaDesamSchema validation -- ${result.error.message}`);
  }
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2) + "\n", "utf8");
}

function writeProvenance(slug: string, newEntries: ProvenanceEntry[], importedAt: string) {
  const filePath = path.join(PROVENANCE_DIR, `${slug}.json`);
  const existing: ProvenanceEntry[] = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
  const combined = [...existing, ...newEntries];
  fs.mkdirSync(PROVENANCE_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(combined, null, 2) + "\n", "utf8");
  void importedAt;
}

// ---------------------------------------------------------------------------
// Tanjai Mamanikoyil -- 3 sub-temples, numbered "1)"/"2)"/"3)" headings.
// The existing shrines[] entries ("Map 1"/"Map 2"/"Map 3") carry no
// explicit per-shrine name in the source (unlike Tiruvaali Tirunagari
// below); they are matched here to the 3 named sub-temples strictly by
// POSITION -- both lists share the same original content block and
// document order (see content-extraction/divya-desams/page.Page24.json:
// contentBlocks order 5 is the combined text listing sub-temples 1,2,3,
// immediately followed by button order 6,7,8 = Map 1,2,3, in that exact
// sequence). This is disclosed as a positional inference, not an
// explicit label pairing, in the provenance entries below.
// ---------------------------------------------------------------------------

function mergeTanjaiMamanikoyil(entries: DivyaDesamBookEntry[], importedAt: string) {
  const entry = findBookEntry(entries, "20) Tanjai Mamanikoyil");
  const { shrineSegments, trailingText } = splitByHeadingLines(
    entry.text,
    ["1) Tanjai Mamanikoyil", "2) Manikkunram", "3) Thanjaiyazhinagar"],
    "Tanjai Mamanikoyil"
  );

  const { filePath, record } = loadRecord("tanjai-mamanikoyil");
  const provenance: ProvenanceEntry[] = [];

  shrineSegments.forEach((segment, index) => {
    const shrineName = segment.name.replace(/^\d\)\s*/, "");
    const parsed = parseSegment(segment.text);
    const shrine = record.shrines[index];
    if (!shrine) throw new Error(`tanjai-mamanikoyil: no existing shrines[${index}] to attach "${shrineName}" to`);

    shrine.name = shrineName;
    shrine.templeInformation = parsed.templeInformation;

    provenance.push({
      field: `shrines[${index}].name`,
      value: shrineName,
      sourceFile: SOURCE_FILE,
      sourcePage: entry.startPage,
      sourceSection: entry.title,
      importedAt,
      note: `Positional inference: shrine ${index} ("${record.shrines[index].label}") is paired with sub-temple ${index + 1} ("${shrineName}") by matching document order within the same original content block (content-extraction/divya-desams/page.Page24.json, contentBlocks order 5 then 6/7/8) -- not an explicit label pairing. Flagged for optional human confirmation.`,
    });
    provenance.push({
      field: `shrines[${index}].templeInformation`,
      value: JSON.stringify(parsed.templeInformation),
      sourceFile: SOURCE_FILE,
      sourcePage: entry.startPage,
      sourceSection: entry.title,
      importedAt,
    });
  });

  const trailing = parseSegment(trailingText);
  if (trailing.templeInformation.travelNote) {
    record.templeInformation.travelNote = trailing.templeInformation.travelNote;
    provenance.push({
      field: "templeInformation.travelNote",
      value: trailing.templeInformation.travelNote,
      sourceFile: SOURCE_FILE,
      sourcePage: entry.startPage,
      sourceSection: entry.title,
      importedAt,
      note: "Record-level: describes the whole 3-temple complex, not one shrine.",
    });
  }
  if (trailing.azhwarPasuram) {
    record.azhwarPasuram = trailing.azhwarPasuram;
    provenance.push({
      field: "azhwarPasuram",
      value: trailing.azhwarPasuram,
      sourceFile: SOURCE_FILE,
      sourcePage: entry.startPage,
      sourceSection: entry.title,
      importedAt,
      note: "Record-level: combined Azhwar Pasuram total across all 3 shrines, as the source presents it.",
    });
  }
  if (trailing.sthalaPuranam) {
    record.sthalaPuranam = trailing.sthalaPuranam;
    provenance.push({
      field: "sthalaPuranam",
      value: trailing.sthalaPuranam,
      sourceFile: SOURCE_FILE,
      sourcePage: entry.startPage,
      sourceSection: entry.title,
      importedAt,
      note: "Record-level: the source's legend explains why the 3 temples together form one kshethram; not attributable to a single shrine.",
    });
  }

  writeRecord(filePath, record);
  writeProvenance("tanjai-mamanikoyil", provenance, importedAt);
  return { slug: "tanjai-mamanikoyil", fieldsWritten: provenance.length };
}

// ---------------------------------------------------------------------------
// Tiruvaali Tirunagari -- 2 places, bare "Tirunagari"/"Tiruvaali" headings.
// The existing shrines[] entries are ALREADY labeled "Tiruvaali" and
// "Tirunagari" verbatim, and the original SAP source explicitly names its
// two Maps buttons "Maps (Tiruvaali)"/"Maps (Tirunagari)"
// (content-extraction/divya-desams/page.Page38.json) -- an explicit,
// non-inferred pairing, matched here by label equality rather than
// position.
// ---------------------------------------------------------------------------

const VEDUPARI_UTSAVAM_MARKER = "*** Vedupari Utsavam";

function mergeTiruvaaliTirunagari(entries: DivyaDesamBookEntry[], importedAt: string) {
  const entry = findBookEntry(entries, "34) Tiruvaali Tirunagari");
  const { shrineSegments, trailingText } = splitByHeadingLines(
    entry.text,
    ["Tirunagari", "Tiruvaali"],
    "Tiruvaali Tirunagari"
  );

  const { filePath, record } = loadRecord("tiruvaali-tirunagari");
  const provenance: ProvenanceEntry[] = [];

  for (const segment of shrineSegments) {
    const parsed = parseSegment(segment.text);
    const shrine = record.shrines.find((s: { label: string | null }) => s.label === segment.name);
    if (!shrine) throw new Error(`tiruvaali-tirunagari: no existing shrine with label "${segment.name}"`);

    shrine.templeInformation = parsed.templeInformation;
    provenance.push({
      field: `shrines[label=${segment.name}].templeInformation`,
      value: JSON.stringify(parsed.templeInformation),
      sourceFile: SOURCE_FILE,
      sourcePage: entry.startPage,
      sourceSection: entry.title,
      importedAt,
      note: `Explicit pairing: the original SAP source labels this shrine's own Maps button "Maps (${segment.name})" (content-extraction/divya-desams/page.Page38.json), matching the existing shrines[].label value exactly -- not an inference.`,
    });
  }

  const trailing = parseSegment(trailingText);

  if (trailing.templeInformation.travelNote) {
    record.templeInformation.travelNote = trailing.templeInformation.travelNote;
    provenance.push({
      field: "templeInformation.travelNote",
      value: trailing.templeInformation.travelNote,
      sourceFile: SOURCE_FILE,
      sourcePage: entry.startPage,
      sourceSection: entry.title,
      importedAt,
      note: "Record-level: describes the relation between the two places, not one shrine.",
    });
  }
  if (trailing.azhwarPasuram) {
    record.azhwarPasuram = trailing.azhwarPasuram;
    provenance.push({
      field: "azhwarPasuram",
      value: trailing.azhwarPasuram,
      sourceFile: SOURCE_FILE,
      sourcePage: entry.startPage,
      sourceSection: entry.title,
      importedAt,
      note: "Record-level: combined Azhwar Pasuram total across both shrines, as the source presents it.",
    });
  }

  // The Sthala Puranam trailing block covers TWO distinct legends: the
  // Lakshmi Narasimhar naming story is specific to the "Tiruvaali" shrine
  // alone; the "*** Vedupari Utsavam" story that follows is joint (it
  // names both places), so it stays record-level. Split on the source's
  // own "***" marker, already used the same way elsewhere in this book
  // (e.g. Tirukalvanoor's theertham field) -- not an invented boundary.
  if (trailing.sthalaPuranam) {
    const markerIdx = trailing.sthalaPuranam.indexOf(VEDUPARI_UTSAVAM_MARKER);
    if (markerIdx === -1) {
      throw new Error('tiruvaali-tirunagari: expected "*** Vedupari Utsavam" marker not found in sthalaPuranam text');
    }
    const tiruvaaliSpecific = trailing.sthalaPuranam.slice(0, markerIdx).trim();
    const jointLegend = trailing.sthalaPuranam.slice(markerIdx).trim();

    const tiruvaaliShrine = record.shrines.find((s: { label: string | null }) => s.label === "Tiruvaali");
    if (!tiruvaaliShrine) throw new Error('tiruvaali-tirunagari: no shrine with label "Tiruvaali"');
    if (tiruvaaliSpecific) {
      tiruvaaliShrine.sthalaPuranam = tiruvaaliSpecific;
      provenance.push({
        field: "shrines[label=Tiruvaali].sthalaPuranam",
        value: tiruvaaliSpecific,
        sourceFile: SOURCE_FILE,
        sourcePage: entry.startPage,
        sourceSection: entry.title,
        importedAt,
        note: 'The naming-legend paragraph preceding the "*** Vedupari Utsavam" marker is specific to the Tiruvaali shrine (explains the name "Tiruvaali").',
      });
    }

    record.sthalaPuranam = jointLegend;
    provenance.push({
      field: "sthalaPuranam",
      value: jointLegend,
      sourceFile: SOURCE_FILE,
      sourcePage: entry.startPage,
      sourceSection: entry.title,
      importedAt,
      note: 'Record-level: the "Vedupari Utsavam" legend involves both Tiruvaali and Tirunagari jointly, not attributable to a single shrine.',
    });
  }

  writeRecord(filePath, record);
  writeProvenance("tiruvaali-tirunagari", provenance, importedAt);
  return { slug: "tiruvaali-tirunagari", fieldsWritten: provenance.length };
}

export function runMultiShrineMerge(importedAt = new Date().toISOString().slice(0, 10)) {
  const entries = parseDivyaDesamBook(PDF_PATH);
  const results = [mergeTanjaiMamanikoyil(entries, importedAt), mergeTiruvaaliTirunagari(entries, importedAt)];
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = runMultiShrineMerge();
  for (const r of results) {
    console.log(`${r.slug}: wrote ${r.fieldsWritten} provenance entries.`);
  }
}
