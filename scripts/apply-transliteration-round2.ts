import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Round 2: applies the terms that scripts/transliteration-audit.ts left
 * flagged (no explicit rule covered them), now resolved by the project
 * owner's explicit go-ahead to make the corpus uniform. Same scope/rules as
 * apply-transliteration.ts: English title/body/description only, book
 * titles exempted for the same terms round 1 exempted "Sri" from, never
 * touching translations fields, author, or content/divya-desams.
 *
 * Deliberately NOT touched (reviewed and left as-is, not oversights):
 * - Shankaracharya, Dronacharya, Vallabhacharya: the Divya Desam corpus
 *   keeps these specific famous-acharya names fully plain (no macrons at
 *   all) as its own consistent pattern -- matched here, not overridden.
 * - Dharma, Karma, Guru, Mantra, Moksha, Upanishad(s): already conform to
 *   the stated rules exactly as currently spelled (no diacritics needed --
 *   all short vowels, and Moksha/Upanishad already use "sh" for the
 *   retroflex/palatal sibilant per rule 4). Applying the rules produces no
 *   change, so there is nothing to replace.
 * - "Avatar" (as opposed to "Avatara"): used as the assimilated-English
 *   word in ordinary prose (e.g. a chapter heading, "The Return of the
 *   Avatar"), distinct from "Avatara"/"Avataram", which is used as the
 *   formal theological term elsewhere in the same books -- confirmed by
 *   reading both contexts directly, not assumed.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const REPLACEMENTS: Record<string, string> = {
  Mahabharata: "Mahābhārata",
  Vishishtadvaita: "Vishishṭādvaita",
  Visishtadvaita: "Vishishṭādvaita",
  Bhagavaan: "Bhagavān",
  Bhagavan: "Bhagavān",
  Paratatvam: "Paratattvam",
  Vedanta: "Vedānta",
  Avatara: "Avatāra",
  Perumaal: "Perumāl",
  Perumal: "Perumāl",
};

/** Same book-title exemption policy as round 1: these terms don't rename the 4 published book titles. */
const SKIP_IN_BOOK_TITLE = new Set(["Mahabharata", "Vishishtadvaita", "Visishtadvaita"]);

let filesChanged = 0;
let totalReplacements = 0;
const changeLog: string[] = [];

function replaceInText(text: string, isBookTitle: boolean): { text: string; count: number } {
  let count = 0;
  let result = text;
  for (const [variant, canonical] of Object.entries(REPLACEMENTS)) {
    if (isBookTitle && SKIP_IN_BOOK_TITLE.has(variant)) continue;
    const re = new RegExp(`\\b${variant}\\b`, "g");
    result = result.replace(re, () => {
      count += 1;
      return canonical;
    });
  }
  return { text: result, count };
}

function processFile(filePath: string, fields: { key: string; isBookTitle?: boolean }[]) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  let fileCount = 0;

  for (const { key, isBookTitle } of fields) {
    if (typeof data[key] !== "string") continue;
    const { text, count } = replaceInText(data[key], isBookTitle ?? false);
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
    processFile(bookJsonPath, [{ key: "title", isBookTitle: true }, { key: "description" }]);
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
