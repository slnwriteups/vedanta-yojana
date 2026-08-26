import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Round 3: fixes a real gap in rounds 1-2 -- those only looked for ASCII
 * spelling VARIANTS of specific words (Krishna, Vishnu, etc.), so they
 * never touched the ~47 files (mostly JAYA chapter epigraphs, plus a few
 * Bhagavatham/Visishtadvaita/Knowledge chapters) that already quote full
 * Sanskrit ślokas/mantras verbatim in raw academic IAST. Two fixes,
 * confirmed with the project owner:
 *
 * 1. Character-level ś->sh and ṣ->sh throughout every scoped field (per
 *    the convention's explicit rule 4) -- these two characters never
 *    appear in plain English, so a global character substitution is safe
 *    without word-boundary logic.
 * 2. "Shree" (a third honorific spelling never accounted for) -> "Shri",
 *    same word-boundary approach as round 1's Sri->Shri.
 *
 * Explicitly NOT touched, per the project owner's decision: anusvara
 * (ṁ/ṃ), visarga (ḥ), and vocalic r/l (ṛ/ḷ) are left exactly as they
 * appear in these verse quotations -- their convention document never
 * addresses these characters, and mechanically inventing a treatment for
 * ~339 occurrences of real Sanskrit verse text is exactly what rule 14
 * warns against.
 *
 * Same scope as rounds 1-2: English title/body/description only, never
 * translations fields, author, or content/divya-desams.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const CHAR_REPLACEMENTS: [RegExp, string][] = [
  [/ś/g, "sh"],
  [/ṣ/g, "sh"],
];

const WORD_REPLACEMENTS: Record<string, string> = {
  Shree: "Shri",
};

let filesChanged = 0;
let totalCharReplacements = 0;
let totalWordReplacements = 0;
const changeLog: string[] = [];

function replaceInText(text: string): { text: string; charCount: number; wordCount: number } {
  let charCount = 0;
  let result = text;
  for (const [re, replacement] of CHAR_REPLACEMENTS) {
    result = result.replace(re, () => {
      charCount += 1;
      return replacement;
    });
  }
  let wordCount = 0;
  for (const [variant, canonical] of Object.entries(WORD_REPLACEMENTS)) {
    const re = new RegExp(`\\b${variant}\\b`, "g");
    result = result.replace(re, () => {
      wordCount += 1;
      return canonical;
    });
  }
  return { text: result, charCount, wordCount };
}

function processFile(filePath: string, fields: string[]) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  let fileCharCount = 0;
  let fileWordCount = 0;

  for (const key of fields) {
    if (typeof data[key] !== "string") continue;
    const { text, charCount, wordCount } = replaceInText(data[key]);
    if (charCount > 0 || wordCount > 0) {
      data[key] = text;
      fileCharCount += charCount;
      fileWordCount += wordCount;
    }
  }

  if (fileCharCount > 0 || fileWordCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    filesChanged += 1;
    totalCharReplacements += fileCharCount;
    totalWordReplacements += fileWordCount;
    changeLog.push(
      `${path.relative(ROOT, filePath)}: ${fileCharCount} char, ${fileWordCount} word replacement(s)`
    );
  }
}

const bookDirs = fs
  .readdirSync(LIBRARY_DIR)
  .map((d) => path.join(LIBRARY_DIR, d))
  .filter((p) => fs.statSync(p).isDirectory());

for (const bookDir of bookDirs) {
  const bookJsonPath = path.join(bookDir, "book.json");
  if (fs.existsSync(bookJsonPath)) processFile(bookJsonPath, ["title", "description"]);

  const chaptersDir = path.join(bookDir, "chapters");
  if (fs.existsSync(chaptersDir)) {
    for (const f of fs.readdirSync(chaptersDir).filter((f) => f.endsWith(".json"))) {
      processFile(path.join(chaptersDir, f), ["title", "body"]);
    }
  }
}

if (fs.existsSync(KNOWLEDGE_DIR)) {
  for (const f of fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".json"))) {
    processFile(path.join(KNOWLEDGE_DIR, f), ["title", "body"]);
  }
}

console.log(`Files changed: ${filesChanged}`);
console.log(`Total character replacements (ś/ṣ -> sh): ${totalCharReplacements}`);
console.log(`Total word replacements (Shree -> Shri): ${totalWordReplacements}`);
console.log(changeLog.join("\n"));
