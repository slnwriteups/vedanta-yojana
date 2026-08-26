import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Read-only audit for the Library-books IAST standardization pass. Scans the
 * English `title`/`body` (book.json also `description`) fields of every
 * Library book/chapter plus content/knowledge/*.json, counts occurrences of
 * each dictionary term, and writes a Markdown report. Makes NO changes to
 * any content file -- this is deliberately the audit-only half of the task;
 * applying replacements is a separate, later script run only after the
 * project owner reviews this report (their own rule: audit before
 * finalizing). Never touches translations.{ta,kn,hi}.* (native-script
 * translations, out of scope for a Latin-script convention), `author`, or
 * content/divya-desams/* (already converted in a prior pass).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

interface DictEntry {
  /** Case-sensitive literal variants to search for, matched at word boundaries. */
  variants: string[];
  canonical: string;
  note?: string;
}

/** High-confidence: grounded in the project owner's explicit rules AND/OR the already-converted Divya Desam corpus. */
const DICTIONARY: DictEntry[] = [
  { variants: ["Vishnu"], canonical: "Vishṇu" },
  { variants: ["Narayana", "Narayane", "Narayani"], canonical: "Nārāyaṇa (family)" },
  { variants: ["Acharya", "Acharyas"], canonical: "Āchārya / Āchāryas" },
  { variants: ["Sahasranama"], canonical: "Sahasranāma" },
  { variants: ["Paramatma", "Paramaathma"], canonical: "Paramātma", note: "Do NOT merge Paratatvam/Paramaathvam here -- flagged separately, likely a distinct term (paratattva)." },
  { variants: ["Azhwar", "Azhwars", "Alwar", "Alwars", "Nammazhwar"], canonical: "Āzhwār", note: "Corpus precedent; the lowercase/no-space forms are the corpus's own typos." },
  { variants: ["Sri"], canonical: "Shri", note: "Body/chapter-title text only. Book titles are exempted per the project owner's decision -- flagged occurrences inside a book.json title are reported but excluded from the count that assumes safe auto-apply." },
];

/** No rule covers these; report counts only, propose nothing. */
const FLAGGED: DictEntry[] = [
  { variants: ["Mahabharata"], canonical: "(uncovered)" },
  { variants: ["Vishishtadvaita", "Visishtadvaita"], canonical: "(uncovered)" },
  { variants: ["Bhagavan", "Bhagavaan"], canonical: "(uncovered)" },
  { variants: ["Paratatvam", "Paramaathvam"], canonical: "(uncovered -- possibly distinct from Paramatma)" },
  { variants: ["Shankaracharya", "Dronacharya", "Vallabhacharya"], canonical: "(uncovered -- corpus keeps these fully plain, an inferred pattern, not an explicit rule)" },
  { variants: ["Perumal", "Perumaal"], canonical: "(uncovered outside Divya Desams)" },
  { variants: ["Vedanta", "Upanishad", "Upanishads", "Dharma", "Karma", "Moksha", "Guru", "Mantra", "Avatar", "Avatara", "Ashram"], canonical: "(uncovered -- generic Sanskrit-derived vocabulary, not addressed by any rule)" },
];

interface Occurrence {
  file: string;
  variant: string;
  field: string;
  count: number;
}

function wordBoundaryCount(text: string, variant: string): number {
  const re = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  return (text.match(re) ?? []).length;
}

function scanField(filePath: string, field: string, text: string | undefined, entries: DictEntry[], out: Occurrence[]) {
  if (!text) return;
  for (const entry of entries) {
    for (const variant of entry.variants) {
      const count = wordBoundaryCount(text, variant);
      if (count > 0) out.push({ file: path.relative(ROOT, filePath), variant, field, count });
    }
  }
}

function collectChapterFiles(bookDir: string): string[] {
  const chaptersDir = path.join(bookDir, "chapters");
  if (!fs.existsSync(chaptersDir)) return [];
  return fs
    .readdirSync(chaptersDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(chaptersDir, f));
}

const dictionaryHits: Occurrence[] = [];
const flaggedHits: Occurrence[] = [];
const bookTitleShriHits: Occurrence[] = [];

const bookDirs = fs
  .readdirSync(LIBRARY_DIR)
  .map((d) => path.join(LIBRARY_DIR, d))
  .filter((p) => fs.statSync(p).isDirectory());

for (const bookDir of bookDirs) {
  const bookJsonPath = path.join(bookDir, "book.json");
  if (fs.existsSync(bookJsonPath)) {
    const book = JSON.parse(fs.readFileSync(bookJsonPath, "utf8"));
    // Book titles are excluded from the Sri->Shri auto-apply count (project
    // owner's decision) but still worth surfacing if "Sri" appears there, so
    // report separately rather than silently.
    for (const variant of ["Sri"]) {
      const count = wordBoundaryCount(book.title ?? "", variant);
      if (count > 0) bookTitleShriHits.push({ file: path.relative(ROOT, bookJsonPath), variant, field: "title (BOOK TITLE, exempted)", count });
    }
    scanField(bookJsonPath, "title", book.title, DICTIONARY.filter((e) => !e.variants.includes("Sri")), dictionaryHits);
    scanField(bookJsonPath, "description", book.description, DICTIONARY, dictionaryHits);
    scanField(bookJsonPath, "title", book.title, FLAGGED, flaggedHits);
    scanField(bookJsonPath, "description", book.description, FLAGGED, flaggedHits);
  }

  for (const chapterPath of collectChapterFiles(bookDir)) {
    const chapter = JSON.parse(fs.readFileSync(chapterPath, "utf8"));
    scanField(chapterPath, "title", chapter.title, DICTIONARY, dictionaryHits);
    scanField(chapterPath, "body", chapter.body, DICTIONARY, dictionaryHits);
    scanField(chapterPath, "title", chapter.title, FLAGGED, flaggedHits);
    scanField(chapterPath, "body", chapter.body, FLAGGED, flaggedHits);
  }
}

if (fs.existsSync(KNOWLEDGE_DIR)) {
  for (const f of fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".json"))) {
    const recordPath = path.join(KNOWLEDGE_DIR, f);
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
    scanField(recordPath, "title", record.title, DICTIONARY, dictionaryHits);
    scanField(recordPath, "body", record.body, DICTIONARY, dictionaryHits);
    scanField(recordPath, "title", record.title, FLAGGED, flaggedHits);
    scanField(recordPath, "body", record.body, FLAGGED, flaggedHits);
  }
}

function groupReport(hits: Occurrence[], entries: DictEntry[]): string {
  let out = "";
  for (const entry of entries) {
    const entryHits = hits.filter((h) => entry.variants.includes(h.variant));
    if (entryHits.length === 0) continue;
    const totalCount = entryHits.reduce((sum, h) => sum + h.count, 0);
    const fileSet = new Set(entryHits.map((h) => h.file));
    out += `\n### ${entry.variants.join(" / ")} → ${entry.canonical}\n`;
    if (entry.note) out += `${entry.note}\n`;
    out += `\n**${totalCount} occurrences across ${fileSet.size} file(s).**\n\n`;
    out += "| File | Field | Variant | Count |\n|---|---|---|---|\n";
    for (const h of entryHits.sort((a, b) => a.file.localeCompare(b.file))) {
      out += `| ${h.file} | ${h.field} | ${h.variant} | ${h.count} |\n`;
    }
  }
  return out;
}

const report = `# IAST Transliteration Audit — Library Books

Generated by \`scripts/transliteration-audit.ts\`. This is a **read-only audit**
— no content files were modified by this run. Scope: \`content/library/**/*.json\`
(\`title\`/\`body\`/\`description\` on English fields only) and
\`content/knowledge/*.json\`. Never scans \`translations.*\`, \`author\`, or
\`content/divya-desams/*\` (already converted).

## Dictionary terms (high confidence — ready to apply pending final sign-off)
${groupReport(dictionaryHits, DICTIONARY) || "\n(none found)\n"}

## "Sri" occurrences inside book titles (excluded from the count above — book titles are exempted per the project owner's decision)
${
  bookTitleShriHits.length > 0
    ? "\n| File | Field | Count |\n|---|---|---|\n" +
      bookTitleShriHits.map((h) => `| ${h.file} | ${h.field} | ${h.count} |`).join("\n") +
      "\n"
    : "\n(none)\n"
}

## Flagged — no rule covers these, zero auto-apply proposed
${groupReport(flaggedHits, FLAGGED) || "\n(none found)\n"}

---
Total dictionary-term occurrences: ${dictionaryHits.reduce((s, h) => s + h.count, 0)}
Total flagged-term occurrences: ${flaggedHits.reduce((s, h) => s + h.count, 0)}
`;

const OUTPUT = path.join(ROOT, "scripts/transliteration-audit-report.md");
fs.writeFileSync(OUTPUT, report);
console.log(`Audit report written to ${path.relative(ROOT, OUTPUT)}`);
console.log(`Dictionary-term occurrences: ${dictionaryHits.reduce((s, h) => s + h.count, 0)}`);
console.log(`Flagged-term occurrences: ${flaggedHits.reduce((s, h) => s + h.count, 0)}`);
