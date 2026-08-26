import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Round 4: fixes internal spelling-consistency inconsistencies surfaced by
 * a corpus-wide consonant-skeleton clustering pass (scripts weren't run
 * for this discovery step -- see chat history) -- the SAME proper noun
 * spelled two different ways within the corpus itself, distinct from
 * rounds 1-3's IAST-diacritic dictionary. Per the project owner's rule 8
 * (one canonical spelling per term, applied consistently) and their
 * decision to apply only the manually-verified genuine duplicates, not
 * the full 255-cluster list the clustering pass produced (most of which
 * were false positives -- unrelated words colliding under a crude
 * vowel-stripped skeleton, e.g. Draupadi/Drupada, Gandhari/Gandhara,
 * Vasishta/Visishta are each two DIFFERENT entities, not spelling
 * variants, and must never be merged).
 *
 * Canonical form = whichever spelling already dominates the corpus by
 * occurrence count (not a new invented spelling) -- consistent with not
 * inventing anything not already established somewhere in this content.
 *
 * Same scope as rounds 1-3: English title/body/description only, never
 * translations fields, author, or content/divya-desams.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const REPLACEMENTS: Record<string, string> = {
  Sree: "Shri",
  Bhishma: "Bheeshma",
  Hastinapura: "Hastinapur",
  Dwarka: "Dwaraka",
  Alavandaar: "Aalavandaar",
  Tirukotiyur: "Tirukkotiyur",
  Kurthazhwan: "Kurathazhwan",
  Anathazhwan: "Ananthazhwan",
  Vardaraja: "Varadaraja",
  Manakkal: "Manakkaal",
  Naathamunigal: "Nathamunigal",
  Tirukkachi: "Tirukacchi",
  Ramannujar: "Ramanujar",
  Ramunjar: "Ramanujar",
  Ramunujar: "Ramanujar",
  Ramnujar: "Ramanujar",
  Ramanuajar: "Ramanujar",
  Parikshit: "Parikshith",
  Aswatthama: "Ashwatthama",
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
