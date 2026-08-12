import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Phase 6A, Step 3/4 -- the "build-time content export step" (Option C
 * from the Phase 6A brief) that bridges /content into the mobile app
 * without ever duplicating editorial content.
 *
 * WHY this exists: Metro (React Native's bundler) requires statically
 * analyzable import paths -- unlike the Node-based web loader
 * (content-lib/loader/index.ts), it cannot fs.readdirSync() an arbitrary
 * directory at runtime and dynamically import whatever it finds. This
 * script enumerates the real, validated /content tree ONCE at build
 * time and emits a TypeScript file that statically imports every JSON
 * file directly from its real location -- the generated file contains
 * only import statements and re-exported arrays, never a copy of the
 * JSON content itself. /content remains the single source of truth;
 * this is glue code, not a second copy.
 *
 * Regenerate after any content change:
 *   node mobile/scripts/generate-content-manifest.ts
 *
 * The output (mobile/content-lib/manifest.generated.ts) is checked in
 * (Metro needs it to exist at bundle time) but should never be hand-
 * edited -- it is fully mechanical, like a lockfile.
 */

const MOBILE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(MOBILE_ROOT, "..");
const CONTENT_ROOT = path.join(REPO_ROOT, "content");
const OUTPUT_FILE = path.join(MOBILE_ROOT, "content-lib", "manifest.generated.ts");

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function listSubdirectories(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** A valid, unique-enough JS identifier for an import binding, derived from a file path. */
function identifierFor(filePath: string, prefix: string): string {
  const base = path
    .basename(filePath, ".json")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
  return `${prefix}_${base}`;
}

/** Relative import specifier from the generated file's directory to a real /content file. */
function importSpecifier(filePath: string): string {
  const relative = path.relative(path.dirname(OUTPUT_FILE), filePath);
  return relative.startsWith(".") ? relative : `./${relative}`;
}

/**
 * `with { type: "json" }` is required by Node's native ESM loader for a
 * plain `import x from "*.json"` (verified empirically: without it,
 * `node --test` fails immediately with ERR_IMPORT_ATTRIBUTE_MISSING).
 * Metro/Babel (the actual React Native bundler) does not require this
 * attribute for its own JSON handling, but it does parse and ignore
 * import-attribute syntax without error, so the identical generated line
 * works under both -- verified by both `node --test` and
 * `expo export` succeeding against this exact file.
 */
function jsonImportLine(identifier: string, filePath: string): string {
  return `import ${identifier} from "${importSpecifier(filePath)}" with { type: "json" };`;
}

function main(): void {
  const imports: string[] = [];

  const ddFiles = listJsonFiles(path.join(CONTENT_ROOT, "divya-desams"));
  const ddIdentifiers = ddFiles.map((f) => identifierFor(f, "dd"));
  ddFiles.forEach((f, i) => imports.push(jsonImportLine(ddIdentifiers[i], f)));

  const knowledgeFiles = listJsonFiles(path.join(CONTENT_ROOT, "knowledge"));
  const knowledgeIdentifiers = knowledgeFiles.map((f) => identifierFor(f, "knowledge"));
  knowledgeFiles.forEach((f, i) => imports.push(jsonImportLine(knowledgeIdentifiers[i], f)));

  const libraryRoot = path.join(CONTENT_ROOT, "library");
  const bookDirs = listSubdirectories(libraryRoot);

  const bookGroupEntries: string[] = [];

  for (const bookDir of bookDirs) {
    const bookJsonPath = path.join(libraryRoot, bookDir, "book.json");
    if (!fs.existsSync(bookJsonPath)) continue;
    const bookIdentifier = identifierFor(bookJsonPath, `book_${bookDir.replace(/[^a-zA-Z0-9]/g, "")}`);
    imports.push(jsonImportLine(bookIdentifier, bookJsonPath));

    const chapterFiles = listJsonFiles(path.join(libraryRoot, bookDir, "chapters"));
    const chapterIdentifiers = chapterFiles.map((f) =>
      identifierFor(f, `chapter_${bookDir.replace(/[^a-zA-Z0-9]/g, "")}`)
    );
    chapterFiles.forEach((f, i) => imports.push(jsonImportLine(chapterIdentifiers[i], f)));

    // "directory" is organizational only (matching the web loader's own
    // note in content-lib/loader/index.ts) -- callers key lookups off
    // the parsed book's validated `slug` field, never this string.
    bookGroupEntries.push(
      `  { directory: "${bookDir}", book: ${bookIdentifier}, chapters: [${chapterIdentifiers.join(", ")}] },`
    );
  }

  const output = `/**
 * AUTO-GENERATED by mobile/scripts/generate-content-manifest.ts.
 * Do not edit by hand -- regenerate instead. See that script for why
 * this file exists (Metro cannot dynamically enumerate /content the way
 * the Node-based web loader does).
 *
 * Every import below points DIRECTLY at the real /content tree (via
 * mobile/metro.config.js's watchFolders) -- nothing here is a copy.
 */
${imports.join("\n")}

/** One entry per file under content/divya-desams/. */
export const rawDivyaDesams: unknown[] = [${ddIdentifiers.join(", ")}];

/** One entry per file under content/knowledge/. */
export const rawKnowledge: unknown[] = [${knowledgeIdentifiers.join(", ")}];

/** One entry per book.json under content/library/, each paired with its own raw chapter files. */
export const rawBookGroups: { directory: string; book: unknown; chapters: unknown[] }[] = [
${bookGroupEntries.join("\n")}
];
`;

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, output, "utf8");

  console.log(
    `Generated ${path.relative(REPO_ROOT, OUTPUT_FILE)}: ${ddFiles.length} Divya Desams, ${bookDirs.length} book(s), ${knowledgeFiles.length} Knowledge record(s).`
  );
}

main();
