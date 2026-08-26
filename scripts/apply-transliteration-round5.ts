import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Round 5: the first slice of the "check all proper nouns" request --
 * scoped deliberately to ONE well-defined, linguistically unambiguous
 * category: Sanskrit feminine names/epithets currently missing their
 * standard long vowel(s), verified against genuine Sanskrit roots (not
 * anglicized spellings -- e.g. Kausalyā, from "Kosala," not the
 * hypercorrected "Kaushalya" that also appears in the corpus).
 *
 * This is explicitly NOT the full proper-noun pass -- masculine character
 * names' internal retroflex consonants (Karna/Karṇa, Drona/Droṇa, etc.),
 * Tamil acharya/temple names, and place names beyond this feminine-name
 * set are a separate, larger task, deliberately deferred per the project
 * owner's own scoping decision (too much individual etymological judgment
 * to responsibly rush through in one pass).
 *
 * Same scope as prior rounds: English title/body/description only, never
 * translations fields, author, or content/divya-desams.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const REPLACEMENTS: Record<string, string> = {
  Sita: "Sītā",
  Draupadi: "Draupadī",
  Kunti: "Kuntī",
  Gandhari: "Gāndhārī",
  Satyavati: "Satyavatī",
  Ayodhya: "Ayodhyā",
  Yamuna: "Yamunā",
  Ganga: "Gangā",
  Kausalya: "Kausalyā",
  Kaushalya: "Kausalyā", // hypercorrected variant, folded into the genuine root form
  Kaikeyi: "Kaikeyī",
  Ahalya: "Ahalyā",
  Subhadra: "Subhadrā",
  Rukmini: "Rukmiṇī",
  Devaki: "Devakī",
  Yashoda: "Yashodā",
  Parvati: "Pārvatī",
  Lakshmi: "Lakshmī",
  Devahuti: "Devahūti",
  Sati: "Satī",
  Mandodari: "Mandodarī",
  Shoorpanakha: "Shūrpaṇakhā",
  Amba: "Ambā",
  Usha: "Ushā",
  Devi: "Devī",
  Sarmishtha: "Sharmishṭhā",
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
