import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Round 10: closes gaps rounds 5-9 missed -- found by fixing a bug in the
 * scanning tool itself (JavaScript's `\b` word-boundary is ASCII-only, so
 * it was truncating already-converted diacritic-bearing words like
 * "Karṇa" into "Kar" and hiding genuinely unconverted names behind that
 * noise). After fixing the scan, several real gaps turned up, verified
 * against the Divya Desam corpus precedent where available
 * (Banasura->Bāṇāsura, Srirangam->Shrīraṅgam, Ambareesha->Ambarīsha all
 * confirmed there) and genuine Sanskrit roots otherwise.
 *
 * Confirmed staying plain (checked against Divya Desam precedent or the
 * established "very common, already assimilated into English" principle):
 * Rukmi, Venkatanatha (both appear plain-only in Divya Desams), Maharishi
 * (globally recognized English spelling, same tier as Yudhishthira).
 *
 * Same scope as prior rounds: English title/body/description only, never
 * translations fields, author, or content/divya-desams.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const REPLACEMENTS: Record<string, string> = {
  Yadava: "Yādava",
  Devayani: "Devayānī",
  Brahmana: "Brāhmaṇa",
  Satyabhama: "Satyabhāmā",
  Sudama: "Sudāmā",
  Bhageeratha: "Bhagīratha",
  Mahalakshmi: "Mahālakshmī",
  Banasura: "Bāṇāsura",
  Kichaka: "Kīchaka",
  Virata: "Virāṭa",
  Srirangam: "Shrīraṅgam",
  Vali: "Vālī",
  Ambareesha: "Ambarīsha",
  Tiukkotiyur: "Tirukkotiyur",
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
