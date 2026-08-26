import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Round 6: second slice of the full proper-noun pass -- masculine Sanskrit
 * character names missing their standard long vowel(s) and/or retroflex
 * consonants, verified against genuine Sanskrit roots (not anglicized
 * spellings), same principle as round 5's feminine-name batch. Also
 * supersedes round 4's majority-vote choice of "Bheeshma" (picked purely
 * because it was the more common spelling already in the corpus) with the
 * genuinely correct root form "Bhīshma" -- the project owner's guidance
 * this round is to prefer Sanskrit-root correctness over whichever
 * spelling happened to already dominate.
 *
 * Deliberately NOT touched: extremely common, already-fully-consistent
 * names treated the same way as the explicit Krishna/Rama/Shiva
 * exceptions (Arjuna, Duryodhana, Yudhishthira, Nakula, Sahadeva, Kaurava,
 * Kuru, Vasudeva, Bharata, Janaka, Shakuni, Dasharatha, Abhimanyu, Vidura
 * -- each individually checked and confirmed to have no genuinely long
 * vowel at all, or (Yudhishthira) judged too disruptive a change to an
 * extremely central, stable name for a single retroflex consonant, kept
 * consistent with how Krishna/Vishnu were partially, not fully,
 * Sanskritized). Tamil-specific proper nouns (Aalavandaar, Manakkaal,
 * etc.) remain out of scope for this Sanskrit-root pass.
 *
 * Same scope as prior rounds: English title/body/description only, never
 * translations fields, author, or content/divya-desams.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const REPLACEMENTS: Record<string, string> = {
  Bhima: "Bhīma",
  Drona: "Droṇa",
  Karna: "Karṇa",
  Vyasa: "Vyāsa",
  Dhritarashtra: "Dhritarāshṭra",
  Ashwatthama: "Ashwatthāmā",
  Pandavas: "Pāṇḍavas",
  Pandava: "Pāṇḍava",
  Shantanu: "Shāntanu",
  Jarasandha: "Jarāsandha",
  Shishupala: "Shishupāla",
  Ravana: "Rāvaṇa",
  Lakshmana: "Lakshmaṇa",
  Hanuman: "Hanumān",
  Vibhishana: "Vibhīshaṇa",
  Sugriva: "Sugrīva",
  Hiranyakashipu: "Hiraṇyakashipu",
  Vishwamitra: "Vishwāmitra",
  Vichitravirya: "Vichitravīrya",
  Sikhandin: "Shikhaṇḍin",
  Parasara: "Parāshara",
  Parashara: "Parāshara",
  Bheeshma: "Bhīshma",
  Dushasana: "Dushāsana",
  Duhsasana: "Dushāsana",
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
