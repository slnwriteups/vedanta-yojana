import fs from "node:fs";
import path from "node:path";
import { DivyaDesamSchema } from "../../content-lib/schemas/index.ts";
import {
  adaptExtractionDivyaDesamRecord,
  adaptImageRegistry,
  type RawExtractionDivyaDesamRecord,
  type RawExternalLinkRecord,
  type RawImageMapEntry,
} from "./adapters/extraction-source-adapter.ts";
import { transformDivyaDesam } from "./divya-desam.ts";

/**
 * Phase 5F — Single-Record Migration: Sri Rangam / Page5.
 *
 * A NARROWLY SCOPED, ONE-RECORD-ONLY migration rehearsal. This is
 * deliberately NOT a general-purpose runner:
 *   - It reads exactly one source file (page.Page5.json), hardcoded.
 *   - It refuses to run against any other pageId.
 *   - It writes exactly one output file and refuses to overwrite an
 *     existing one.
 *   - It has no directory-glob, no loop over multiple source records, and
 *     no command-line arguments that could point it elsewhere.
 *
 * The 108-record runner is explicitly NOT built here (Phase 5H).
 *
 * Run with: node scripts/migration/migrate-page5.ts
 */

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const EXPECTED_PAGE_ID = "page.Page5";
const SOURCE_FILE = path.join(REPO_ROOT, "content-extraction/divya-desams/page.Page5.json");
const IMAGE_MAP_FILE = path.join(REPO_ROOT, "content-extraction/image-map.json");
const EXTERNAL_LINKS_FILE = path.join(REPO_ROOT, "content-extraction/resources/external-links.json");
const OUTPUT_DIR = path.join(REPO_ROOT, "content/divya-desams");

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main(): void {
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`Expected source file not found: ${SOURCE_FILE}`);
  }

  const raw = readJson(SOURCE_FILE) as RawExtractionDivyaDesamRecord;

  // Hard guard: this script must never process anything but Page5, even
  // if SOURCE_FILE were ever accidentally repointed.
  if (raw.pageId !== EXPECTED_PAGE_ID) {
    throw new Error(
      `Refusing to proceed: source file's pageId is "${raw.pageId}", expected "${EXPECTED_PAGE_ID}".`
    );
  }

  const imageMap = readJson(IMAGE_MAP_FILE) as { images: RawImageMapEntry[] };
  const externalLinksData = readJson(EXTERNAL_LINKS_FILE) as { links: RawExternalLinkRecord[] };
  const page5CrossReferenceLinks = externalLinksData.links.filter(
    (link) => link.pageId === EXPECTED_PAGE_ID
  );

  const source = adaptExtractionDivyaDesamRecord(raw, page5CrossReferenceLinks);
  const imageRegistry = adaptImageRegistry(imageMap.images, raw.imageAssetRefs);

  const result = transformDivyaDesam(source, { imageRegistry });

  // Independent re-validation (transformDivyaDesam already validates
  // internally; this proves the contract holds from the runner's own
  // perspective too, per Phase 5E section 17's spirit).
  const validated = DivyaDesamSchema.parse(result);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${validated.slug}.json`);

  if (fs.existsSync(outputPath)) {
    throw new Error(
      `Refusing to overwrite existing content record: ${outputPath}. ` +
        `Delete it manually first if you intend to regenerate it.`
    );
  }

  fs.writeFileSync(outputPath, JSON.stringify(validated, null, 2) + "\n", "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`slug: ${validated.slug}`);
  console.log(`displayName: ${validated.displayName}`);
  console.log(`status: ${validated.status}`);
  console.log(`migration.sourcePageId: ${validated.migration.sourcePageId}`);
}

main();
