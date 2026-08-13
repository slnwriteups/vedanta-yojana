import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSearchCorpus } from "../content-lib/search/corpus.ts";

/**
 * Emits public/search-index.json, the corpus the browser searches against.
 *
 * Runs as npm's `prebuild`, so `npm run build` always regenerates it
 * before Next.js copies public/ into the export -- the index cannot go
 * stale relative to content/ without someone deliberately bypassing the
 * build. It is generated rather than committed, and .gitignore'd
 * accordingly: it is a pure derivative of content/, and a committed copy
 * would be one more thing to forget to regenerate.
 *
 * This exists because a statically exported site has no server to run
 * buildSearchCorpus() per request. The corpus is small enough for this to
 * be reasonable -- content/ is ~884K across 165 files, and the corpus is
 * a projection of it, not a copy of every field.
 */

const OUTPUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/search-index.json"
);

const corpus = buildSearchCorpus();
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(corpus));

const sizeKb = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
console.log(
  `search index: ${corpus.length} documents -> ${path.relative(process.cwd(), OUTPUT)} (${sizeKb} KB)`
);
