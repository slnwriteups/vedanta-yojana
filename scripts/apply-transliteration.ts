import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Applies the "ready to apply" half of scripts/transliteration-audit-report.md
 * (the dictionary terms explicitly confirmed by the project owner) to the
 * English title/body/description fields of the Library books and the
 * Knowledge record. Deliberately does NOT touch anything in the audit
 * report's "Flagged" section (no rule covers those terms yet). Never
 * touches translations.{ta,kn,hi}.*, `author`, or content/divya-desams/*
 * (already converted in a prior pass).
 *
 * Whole-word-boundary, case-sensitive replacement -- every variant here was
 * confirmed by the audit to appear only in its listed capitalization, so no
 * case-folding/re-casing logic is needed. "Acharya" cannot accidentally
 * match inside "Acharyas" (no word boundary between "Acharya" and the
 * trailing "s"), and "Azhwar"/"Azhwars" cannot match inside "Nammazhwar"
 * (no word boundary mid-token, plus differing case) -- each mapping is
 * independent and order-safe.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const REPLACEMENTS: Record<string, string> = {
  Vishnu: "Vishṇu",
  Narayana: "Nārāyaṇa",
  Narayane: "Nārāyaṇe",
  Narayani: "Nārāyaṇī",
  Acharyas: "Āchāryas",
  Acharya: "Āchārya",
  Sahasranama: "Sahasranāma",
  Paramatma: "Paramātma",
  Paramaathma: "Paramātma",
  Azhwars: "Āzhwārs",
  Azhwar: "Āzhwār",
  Alwars: "Āzhwārs",
  Alwar: "Āzhwār",
  Nammazhwar: "Nam Āzhwār",
  Sri: "Shri",
};

/** Fields where "Sri" must NOT be converted -- the 4 top-level book titles, exempted per the project owner's decision. */
const SKIP_SRI_FIELD = "title";

let filesChanged = 0;
let totalReplacements = 0;
const changeLog: string[] = [];

function replaceInText(text: string, skipSri: boolean): { text: string; count: number } {
  let count = 0;
  let result = text;
  for (const [variant, canonical] of Object.entries(REPLACEMENTS)) {
    if (skipSri && variant === "Sri") continue;
    const re = new RegExp(`\\b${variant}\\b`, "g");
    result = result.replace(re, () => {
      count += 1;
      return canonical;
    });
  }
  return { text: result, count };
}

function processFile(filePath: string, fields: { key: string; skipSri?: boolean }[]) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  let fileCount = 0;

  for (const { key, skipSri } of fields) {
    if (typeof data[key] !== "string") continue;
    const { text, count } = replaceInText(data[key], skipSri ?? false);
    if (count > 0) {
      data[key] = text;
      fileCount += count;
    }
  }

  if (fileCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    filesChanged += 1;
    totalReplacements += fileCount;
    changeLog.push(`${path.relative(ROOT, filePath)}: ${fileCount} replacement(s)`);
  }
}

const bookDirs = fs
  .readdirSync(LIBRARY_DIR)
  .map((d) => path.join(LIBRARY_DIR, d))
  .filter((p) => fs.statSync(p).isDirectory());

for (const bookDir of bookDirs) {
  const bookJsonPath = path.join(bookDir, "book.json");
  if (fs.existsSync(bookJsonPath)) {
    processFile(bookJsonPath, [{ key: "title", skipSri: true }, { key: "description" }]);
  }

  const chaptersDir = path.join(bookDir, "chapters");
  if (fs.existsSync(chaptersDir)) {
    for (const f of fs.readdirSync(chaptersDir).filter((f) => f.endsWith(".json"))) {
      processFile(path.join(chaptersDir, f), [{ key: "title" }, { key: "body" }]);
    }
  }
}

if (fs.existsSync(KNOWLEDGE_DIR)) {
  for (const f of fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".json"))) {
    processFile(path.join(KNOWLEDGE_DIR, f), [{ key: "title" }, { key: "body" }]);
  }
}

console.log(`Files changed: ${filesChanged}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log(changeLog.join("\n"));
