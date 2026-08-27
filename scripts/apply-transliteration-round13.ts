import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Round 13: applies the master dictionary's Section J (Sri Vaishnava/Tamil
 * terminology) -- the one category deliberately withheld from round 12
 * because it directly contradicts the already-published Divya Desam corpus
 * precedent (e.g. Perumāl/Thāyār/Āzhwār/Kovil there vs. Perumāḷ/Tāyār/
 * Azhvār/Kōvil proposed here). Per explicit instruction ("Make the Sri
 * Vaishnava changes"), this round proceeds with the dictionary's proposed
 * forms for the Library corpus, creating a KNOWN, DISCLOSED divergence from
 * the Divya Desam section's spelling for these specific terms. The Divya
 * Desam corpus itself is never touched by this or any prior round.
 *
 * Shri->Sri reversal (confirmed in round 12) is applied inline here rather
 * than via a separate final pass: the dictionary's own "Shri Vaishnava" /
 * "Shrivaishnava" proposals are corrected to "Sri Vaishnava" / "Srivaishnava"
 * directly in the table below.
 *
 * Excluded as literal self-mapping no-ops (the dictionary's own listed
 * "canonical" spelling already matches the find term -- including them
 * verbatim would just re-flag the round-12 zero-content-change bug):
 * Prabandham->Prabandham, Divyaprabandham->Divyaprabandham,
 * Tirukacchi->Tirukacchi.
 *
 * SCOPE: only `body` (chapters) and `description` (book.json) -- `title`
 * fields (book and chapter) are never touched, per standing instruction.
 * Never touches content/divya-desams/*.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const REPLACEMENTS: Record<string, string> = {
  // Azhwar family
  Azhwar: "Azhvār",
  Azhvaar: "Azhvār",
  Azhwars: "Azhvārs",
  Azhwan: "Azhvān",
  Namazhwar: "Nammāzhvār",
  Nammalwar: "Nammāzhvār",
  "Nammāzhwar": "Nammāzhvār",
  // Nambigal / Perumal / Thayaar
  Nambigal: "Nambigaḷ",
  Perumal: "Perumāḷ",
  Thayaar: "Tāyār",
  Thayar: "Tāyār",
  // Aalavandaar
  Aalavandaar: "Āḷavandār",
  Aalavandhaar: "Āḷavandār",
  Alavandaar: "Āḷavandār",
  // Ramanuja family
  Ramanujacharya: "Rāmānujāchārya",
  Ramanujar: "Rāmānujar",
  Ramunjar: "Rāmānujar",
  Ramnujar: "Rāmānujar",
  Ramanuja: "Rāmānuja",
  // Kurathalwan / other acharyas
  Kurathalwan: "Kūrattāzhvān",
  Kurathazhwan: "Kūrattāzhvān",
  Nampillai: "Nampiḷḷai",
  Nanjiyar: "Nañjīyar",
  "Manavala Mamunigal": "Maṇavāḷa Māmunigaḷ",
  Mamunigal: "Māmunigaḷ",
  // Pasuram / Prabandham
  Pasurams: "Pāsurams",
  Pasuram: "Pāsuram",
  Pashurams: "Pāsurams",
  Pashuram: "Pāsuram",
  Prabandhangal: "Prabandhaṅgaḷ",
  Divyaprabandhangal: "Divyaprabandhaṅgaḷ",
  Tiruvaimozhi: "Tiruvāymoḻi",
  // Tiru- place names
  Tirukkachi: "Tirukacchi",
  Tiukacchi: "Tirukacchi",
  Tirukkotiyur: "Tirukkoṭiyūr",
  Tirukotiyur: "Tirukkoṭiyūr",
  Tiukkotiyur: "Tirukkoṭiyūr",
  Tirukkurugai: "Tirukkuṟugai",
  Tirukurungudi: "Tirukkuṟuṅkuṭi",
  Tirunarayanapuram: "Tirunārāyaṇapuram",
  Tirunarayanpuram: "Tirunārāyaṇapuram",
  Tiruvenkatamudaiyan: "Tiru-veṅkaṭamuṭaiyān",
  Tiruvenkatamudaiyaan: "Tiru-veṅkaṭamuṭaiyān",
  Tiruvenkatam: "Tiruveṅkaṭam",
  Tiruvallikeni: "Tiruvallikēṇi",
  Tirumaaliruncholai: "Tirumāliruñchōlai",
  Tirumaliruncholai: "Tirumāliruñchōlai",
  Tiruvananthapuram: "Tiruvanantapuram",
  Tiruvanparisaram: "Tiruvaṇparisāram",
  Tiruvattaru: "Tiruvaṭṭāṟu",
  Tirupullani: "Tiruppuḷḷāṇi",
  Tiruputkuzhi: "Tirupputkuḻi",
  Tirukkudandai: "Tirukkuṭantai",
  Tirunagari: "Tirunāgari",
  Kovil: "Kōvil",
  // Sri Vaishnava / Vaishnava (Shri->Sri reversal applied inline)
  "Sri Vaishnavas": "Sri Vaishṇavas",
  "Sri Vaishnava": "Sri Vaishṇava",
  Srivaishnavas: "Srivaishṇavas",
  Srivaishnava: "Srivaishṇava",
  Vaishnavism: "Vaishṇavism",
  Vaishnavas: "Vaishṇavas",
  Vaishnava: "Vaishṇava",
};

let filesChanged = 0;
let totalReplacements = 0;
const changeLog: string[] = [];

function replaceInText(text: string): { text: string; count: number } {
  let count = 0;
  let result = text;
  for (const [variant, canonical] of Object.entries(REPLACEMENTS)) {
    const re = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    result = result.replace(re, () => {
      count += 1;
      return canonical;
    });
  }
  return { text: result, count };
}

// Title fields are NEVER touched this round, per standing instruction.
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
  if (fs.existsSync(bookJsonPath)) processFile(bookJsonPath, ["description"]); // title excluded

  const chaptersDir = path.join(bookDir, "chapters");
  if (fs.existsSync(chaptersDir)) {
    for (const f of fs.readdirSync(chaptersDir).filter((f) => f.endsWith(".json"))) {
      processFile(path.join(chaptersDir, f), ["body"]); // title excluded
    }
  }
}

if (fs.existsSync(KNOWLEDGE_DIR)) {
  for (const f of fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".json"))) {
    processFile(path.join(KNOWLEDGE_DIR, f), ["body"]); // title excluded
  }
}

console.log(`Files changed: ${filesChanged}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log(changeLog.join("\n"));
