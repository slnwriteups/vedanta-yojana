import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Round 11: extends the pass from proper nouns to generic Sanskrit-derived
 * vocabulary that has been anglicized -- per the project owner's explicit
 * direction that this isn't limited to names. Applies the same rule (long
 * vowels get macrons per rule 1, ch/sh per rules 3-4, retroflex ṇ/ṭ/ḍ/ñ
 * retained per rule 5) to common nouns, not just names.
 *
 * Note: content/divya-desams itself still has some of these words in
 * plain form too (e.g. "Vaishnava", "Gita", "Ashramam") -- that corpus's
 * original transliteration pass focused on proper nouns/temple
 * terminology, not this generic-vocabulary category, so it is NOT a
 * counter-precedent here; per the project owner's direct instruction,
 * genuine Sanskrit-root correctness governs this round regardless.
 * content/divya-desams itself is still not touched by this pass (out of
 * scope, as in every prior round).
 *
 * Same scope as prior rounds: English title/body/description only, never
 * translations fields, author, or content/divya-desams.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const REPLACEMENTS: Record<string, string> = {
  Ashramams: "Āshramams",
  Ashramam: "Āshramam",
  Jnanam: "Jnānam",
  Jnana: "Jnāna",
  Sanyasi: "Sanyāsī",
  Sanyasa: "Sanyāsa",
  Shastra: "Shāstra",
  Sutras: "Sūtras",
  Sutra: "Sūtra",
  Yatra: "Yātrā",
  Sampradayam: "Sampradāyam",
  Vaishnavism: "Vaishṇavism",
  Vaishnavas: "Vaishṇavas",
  Vaishnava: "Vaishṇava",
  Parampara: "Paramparā",
  Kanda: "Kāṇḍa",
  Gita: "Gītā",
  Brahmins: "Brāhmaṇas",
  Brahmanas: "Brāhmaṇas",
  Brahmin: "Brāhmaṇa",
};

let filesChanged = 0;
let totalReplacements = 0;
const changeLog: string[] = [];

function replaceInText(text: string): { text: string; count: number } {
  let count = 0;
  let result = text;
  for (const [variant, canonical] of Object.entries(REPLACEMENTS)) {
    const re = new RegExp(`\\b${variant}\\b`, "g");
    result = result.replace(re, () => {
      count += 1;
      return canonical;
    });
  }
  return { text: result, count };
}

function processFile(filePath: string, fields: string[]) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  let fileCount = 0;

  for (const key of fields) {
    if (typeof data[key] !== "string") continue;
    const { text, count } = replaceInText(data[key]);
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
console.log(`Total replacements: ${totalReplacements}`);
console.log(changeLog.join("\n"));
