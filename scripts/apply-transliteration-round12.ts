import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Round 12: applies the bulk of the user's exhaustive master FIND->REPLACE
 * dictionary, after a full audit against the current corpus and against
 * three sources of authority: (1) the user's own explicit resolutions of
 * conflicts with earlier-session decisions, (2) the already-established
 * Divya Desam corpus precedent, (3) the user's own stated sh/ch rules
 * (a few of the dictionary's own replacement values used raw ś/ṣ,
 * corrected here to sh per the user's own priority hierarchy: "if strict
 * academic IAST conflicts with my convention, my convention wins").
 *
 * SCOPE CHANGE this round, per explicit instruction: only `body` (chapters)
 * and `description` (book.json) are touched -- `title` fields (both book
 * and chapter) are never touched, at all, regardless of term.
 *
 * Resolved this round (superseding earlier-session decisions, per explicit
 * "follow the new conventions" instruction): Rama->Rāma, Balarama->Balarāma,
 * Parashurama->Parashurāma (all three: the "stays plain" rama-exception is
 * retired), Brahma->Brahmā, Yudhishthira->Yudhi-shṭhira (hyphenated,
 * confirming hyphenation as the new device for heavy conjunct clusters --
 * also applied to Dhritarāshṭra, already macronized in round 6, now
 * re-hyphenated to Dhri-tarāshṭra, and to the new Dhrishtadyumna->
 * Dhri-shṭadyumna).
 *
 * Reversed this round, per explicit confirmation: Shri (the form every
 * prior round established) -> Sri. This is a deliberate full reversal, not
 * a mistake -- confirmed directly.
 *
 * Deliberately NOT included this round -- flagged as conflicting with
 * established Divya Desam corpus precedent (88-115 occurrences of the
 * existing form vs 0 of the new dictionary's proposal), held for a
 * separate decision: the entire Sri Vaishnava/Tamil terminology set
 * (Azhwar/Perumal/Thayaar/Nambigal/Kovil/Kanchipuram and the rest of that
 * category), since blindly applying it would contradict a corpus section
 * this pass doesn't even touch.
 *
 * Also NOT included -- genuinely ambiguous, per the user's own "do not
 * guess" rule: Bhrigu (the dictionary contradicts itself, Bhṛgu vs Bhrigu
 * -- resolved here as a no-op, since "Bhrigu" already matches the
 * established vocalic-ṛ-as-"ri" readable pattern used everywhere else in
 * this corpus, e.g. Krishna itself); Bharata (genuinely two different
 * words -- the person Bharata, always short, vs the derived/vrddhied
 * Bhārata used for the land/epic -- a blind find-replace can't
 * disambiguate this correctly without per-occurrence context, so left
 * untouched pending that check); Panini, Mimamsa, Vyakarana, Tarka,
 * Dantavakra, Aadhimoola, Huhu, Kesadi-pada Varnanam, Shravana (all
 * flagged ambiguous in the prior audit, none resolved by this message).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_DIR = path.join(ROOT, "content/library");
const KNOWLEDGE_DIR = path.join(ROOT, "content/knowledge");

const REPLACEMENTS: Record<string, string> = {
  // Section A -- resolved conflicts + new items (Shri-family handled separately below)
  Narayanan: "Nārāyaṇan",
  Mahavishnu: "Mahā Vishṇu",
  Ramar: "Rāmar",
  Rama: "Rāma",
  Balarama: "Balarāma",
  Brahma: "Brahmā",
  Kartikeya: "Kārtikeya",
  Parashurama: "Parashurāma",
  // Section B
  "Swayambhuva Manu": "Svāyambhuva Manu",
  "Svayambhuva Manu": "Svāyambhuva Manu",
  Swayambhuva: "Svāyambhuva",
  Svayambhuva: "Svāyambhuva",
  Shatarupa: "Shatarūpā",
  Suneethi: "Sunīti",
  Suniti: "Sunīti",
  Dakshayini: "Dākshāyaṇī",
  Mahabali: "Mahābali",
  Kashyapa: "Kāshyapa",
  Jadabharatha: "Jaḍabharata",
  Rahuguna: "Rahūgaṇa",
  Rahugana: "Rahūgaṇa",
  Adishesha: "Ādishesha",
  Adisesha: "Ādishesha",
  Sanatana: "Sanātana",
  Sanatkumara: "Sanatkumāra",
  Vasishtha: "Vasishṭha",
  Vasishta: "Vasishṭha",
  Bhagirathi: "Bhāgīrathī",
  Jahnavi: "Jāhnavī",
  // Section C
  "Yudhishthira": "Yudhi-shṭhira",
  "Dhritarāshṭra": "Dhri-tarāshṭra",
  Dronacharya: "Droṇāchārya",
  Bhimasena: "Bhīmasena",
  Kuntidevi: "Kuntīdevī",
  Pandu: "Pāṇḍu",
  Sakuni: "Shakuni",
  Salya: "Shalya",
  Sishupala: "Shishupāla",
  Kripacharya: "Kripāchārya",
  Ghatotkacha: "Ghaṭotkacha",
  Satyaki: "Sātyaki",
  Kritavarma: "Kṛtavarmā",
  Kritavarman: "Kṛtavarmā",
  Dhrishtadyumna: "Dhri-shṭadyumna",
  // Section D
  Chitralekha: "Chitrālekhā",
  Kansa: "Kaṃsa",
  Akrura: "Akrūra",
  Akroora: "Akrūra",
  Satrajit: "Satrājit",
  Jambavan: "Jāmbavān",
  Sharnga: "Sharṅga",
  "Syamantaka Mani": "Syamantaka Maṇi",
  "Parijata Vrittantam": "Pārijāta Vṛttāntam",
  Parijata: "Pārijāta",
  Narakasura: "Narakāsura",
  // Section E
  Angada: "Aṅgada",
  Jatayu: "Jaṭāyu",
  Sampati: "Sampāti",
  Shabari: "Shabarī",
  Thataka: "Tāṭakā",
  Maricha: "Mārīcha",
  Dushana: "Dūshaṇa",
  Kumbhakarna: "Kumbhakarṇa",
  Manthara: "Mantharā",
  // Section F
  Vivasvaan: "Vivasvān",
  Vivasvan: "Vivasvān",
  Shwethavaraha: "Shvetavarāha",
  Shwetavaraha: "Shvetavarāha",
  "Dwapara Yuga": "Dvāpara Yuga",
  "Treta Yuga": "Tretā Yuga",
  "Krita Yuga": "Kṛta Yuga",
  "Jambu Dweepam": "Jambu Dvīpam",
  "Bharata-varsha": "Bhārata-varsha",
  Parabhava: "Parābhava",
  Dakshinayana: "Dakshiṇāyana",
  Simha: "Siṃha",
  Shashti: "Shashṭhi",
  Svati: "Svātī",
  Sankalpam: "Saṅkalpam",
  Sankalpa: "Saṅkalpa",
  // Section G
  Atman: "Ātman",
  Aathma: "Ātma",
  Jeeva: "Jīva",
  Jivatma: "Jīvātmā",
  Jeevatma: "Jīvātmā",
  Jeevaathma: "Jīvātmā",
  Gnanam: "Jñānam",
  Mukthi: "Mukti",
  Sharanagati: "Sharaṇāgati",
  Sharanam: "Sharaṇam",
  Yajna: "Yajña",
  Yagna: "Yajña",
  Yajnam: "Yajñam",
  Purana: "Purāṇa",
  Puranam: "Purāṇam",
  Puranas: "Purāṇas",
  Ishwara: "Īshvara",
  Iswara: "Īshvara",
  Guna: "Guṇa",
  Gunas: "Guṇas",
  Taamasa: "Tāmasa",
  Ahankara: "Ahaṅkāra",
  Ahankaram: "Ahaṅkāram",
  Swaroopa: "Svarūpa",
  Swaroopam: "Svarūpam",
  Swarupam: "Svarūpam",
  Kshethra: "Kshetra",
  Kshetrajna: "Kshetrajña",
  Vairagya: "Vairāgya",
  Sadhana: "Sādhanā",
  Sanyasa: "Sanyāsa",
  Sanyasi: "Sanyāsī",
  Tapasya: "Tapasyā",
  Sankhya: "Sāṅkhya",
  Saalokya: "Sālokya",
  Saarupya: "Sārūpya",
  Saayujya: "Sāyujya",
  // Section H
  Puja: "Pūjā",
  Pooja: "Pūjā",
  Aradhana: "Ārādhana",
  Aaradhana: "Ārādhana",
  Pradakshinam: "Pradakshiṇam",
  Prasadam: "Prasādam",
  Diksha: "Dīkshā",
  Snanam: "Snānam",
  Yatra: "Yātrā",
  "Theertha-Yatra": "Tīrtha-Yātrā",
  Theertha: "Tīrtha",
  Swayamvara: "Svayaṃvara",
  Swayamvaram: "Svayaṃvaram",
  Ekadashi: "Ekādashī",
  "Dwadashi-Vratam": "Dvādashī-Vratam",
  Dwadashi: "Dvādashī",
  Chaturdashi: "Chaturdashī",
  Yagnam: "Yajñam",
  Shankha: "Shaṅkha",
  Paduka: "Pādukā",
  // Section I
  Prajapati: "Prajāpati",
  Kamadhenu: "Kāmadhenu",
  Uchaishravas: "Uchchaiḥshravas",
  Halahala: "Hālahala",
  Vasuki: "Vāsuki",
  Airavata: "Airāvata",
  Sarasvati: "Sarasvatī",
  rudraksha: "rudrāksha",
  Rudraksha: "Rudrāksha",
  // Section F additions (new terms found this round)
  Hiranyakashipu: "Hiraṇyakashipu", // already partly converted; keep for safety
  Hiranyaksha: "Hiraṇyāksha",
  Shukracharya: "Shukrāchārya",
  Sukracharya: "Shukrāchārya",
  Ikshvaku: "Ikshvāku",
  // Section K -- non-Tamil classical Sanskrit geography only (Tamil temple
  // place-names deliberately excluded this round, see file header)
  Lanka: "Laṅkā",
  Rameswaram: "Rāmeshvaram",
  Kishkindha: "Kiṣkindhā",
  Chitrakoota: "Chitrakūṭa",
  Sarayu: "Sarayū",
  Ganga: "Gaṅgā",
  Ganges: "Gaṅgā",
  Godavari: "Godāvarī",
  Narmada: "Narmadā",
  Kailasa: "Kailāsa",
  Kailash: "Kailāsha",
  Gokul: "Gokula",
  Kashi: "Kāshī",
  Devaprayag: "Devaprayāga",
  Prayag: "Prayāga",
  // Section L
  "Srimad Bhagavatam": "Shrīmad Bhāgavatam",
  "Srimad Bhagavata": "Shrīmad Bhāgavata",
  Bhagavatam: "Bhāgavatam",
  Bhagavata: "Bhāgavata",
  Mahabharata: "Mahābhārata",
  "Bhagavad Gita": "Bhagavad Gītā",
  Ramayana: "Rāmāyaṇa",
  Ramayanam: "Rāmāyaṇam",
  Narayaneeyam: "Nārāyaṇīyam",
  "Vishnu Purana": "Vishṇu Purāṇa",
  "Nalayira Divya Prabandham": "Nālāyira Divya Prabandham",
  Yadavabyudayam: "Yādavābhyudayam",
  "Hayagreeva Stotram": "Hayagrīva Stotram",
  "Paduka Sahasram": "Pādukā Sahasram",
  "Daya Shatakam": "Dayā Shatakam",
  Abheetistavam: "Abhītistavam",
  "Hamsa Sandesham": "Haṃsa Sandesham",
  // Section M
  "Visishta Advaita": "Vishishṭādvaita",
  Visishtadvaita: "Vishishṭādvaita",
  Vishistadvaita: "Vishishṭādvaita",
  Visishtaadvaita: "Vishishṭādvaita",
  Advaitha: "Advaita",
  Dvaitha: "Dvaita",
  // Section N
  Acharyan: "Āchāryan",
  Yamunacharyar: "Yāmunāchāryar",
  Yamunacharar: "Yāmunāchāryar",
  Nathamunigal: "Nāthamunigaḷ",
  Naathamunigal: "Nāthamunigaḷ",
  Venkatanatha: "Veṅkaṭanātha",
  Bodhayana: "Bodhāyana",
  Bhodhayana: "Bodhāyana",
  Badarayana: "Bādarāyaṇa",
  "Achyuta Pisharati": "Achyuta Pishārati",
  "Thunchath Ezhuthachan": "Tuñchath Ezhuthachan",
  // Section O compounds
  Panchasamskaram: "Pañcha-Saṃskāram",
  "Tattva-Hita-Purushartha": "Tattva-Hita-Purushārtha",
  "Sharira-Shariri Bhaava": "Sharīra-Sharīri Bhāva",
};

// Applied last, after everything above, so it also catches "Shri" tokens
// introduced by any of the replacements (e.g. inside a compound).
const FINAL_PASS: Record<string, string> = {
  Shri: "Sri",
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
  for (const [variant, canonical] of Object.entries(FINAL_PASS)) {
    const re = new RegExp(`\\b${variant}\\b`, "g");
    result = result.replace(re, () => {
      count += 1;
      return canonical;
    });
  }
  return { text: result, count };
}

// Title fields are NEVER touched this round, per explicit instruction.
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
