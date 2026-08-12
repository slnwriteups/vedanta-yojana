# content-extraction/

**This is a migration/extraction artifact, not application source code.**

It contains content recovered from the legacy SAP Build Apps export that lives
at the repository root (`_next/`, `page.Page*.html`, `nodered.min.js`, etc.).
That original export is **untouched** by anything in this directory — every
script here only *reads* it.

## Why this exists

The old Vedanta Yojana app's real content (108 Divya Desam temple pages,
philosophy/scripture articles, 217 images, and ~550 external resource links)
is not stored as clean data anywhere in the repository. It is compiled and
buried inside a single 14.4MB minified JS bundle:
`_next/static/chunks/pages/_app-72a25e792e2e05f2.js`. This directory recovers
that content into clean, readable, versionable JSON so it can survive
independently of the old SAP Build Apps runtime.

**This is not the final content schema for the new application.** It is a
faithful recovery of what exists in the old source, preserved as-is
(including its gaps, placeholder text, and inconsistencies). The future
application's content architecture will be designed separately, after this
extraction has been reviewed by a human.

## Layout

```
content-extraction/
├── README.md                    (this file)
├── extraction-report.md         Human-readable summary — read this first
├── page-inventory.json          All 171 source pages, structural facts only
├── image-map.json               ag-asset://UUID -> /images/ file mapping + anomalies
├── navigation-map.json          Tab config + internal page-to-page nav graph
├── unresolved.json              Everything that could NOT be confidently resolved
├── divya-desams/                108 candidate Divya Desam page records (+ index.json)
├── articles/                    56 non-temple content page records (+ index.json)
├── resources/
│   └── external-links.json      All 552 "Open URL" actions (PDFs, Google Maps, etc.)
├── scripts/                     The extraction pipeline itself (see below)
└── _generated/                  Large intermediate artifacts (see below)
```

## Reproducing the extraction

Requires only Node.js (no `npm install`, no external dependencies — every
script uses built-in `fs`/`path`/`crypto`/`child_process` only):

```
bash content-extraction/scripts/run-all.sh
```

This re-reads the original bundle (verifying its SHA-256 first) and rewrites
every file under `content-extraction/` except this README and the report.
Re-running is safe and deterministic: given the same input bundle, every
generated JSON file is byte-identical across runs (no timestamps or random
IDs are embedded in the data files).

Pipeline stages (`content-extraction/scripts/`):

| Script | Produces |
|---|---|
| `01-extract-app-definition.js` | `_generated/app-definition.json`, `_generated/provenance.json` |
| `02-build-page-inventory.js` | `page-inventory.json`, `_generated/page-content.json` |
| `03-build-image-map.js` | `image-map.json` |
| `04-build-resources-and-navigation.js` | `resources/external-links.json`, `navigation-map.json` |
| `05-classify-and-emit-records.js` | `divya-desams/*.json`, `articles/*.json`, both `index.json` files |
| `06-build-unresolved.js` | `unresolved.json` |
| `07-validate.js` | Validation report only (no output files) |

`lib/decode-bundle.js` and `lib/walk-components.js` contain the shared,
documented logic for locating/decoding the app definition and walking a
page's component tree — read these first if you want to understand *how* the
data was recovered, not just what was recovered.

## `_generated/` vs the top-level files

`_generated/` holds large intermediate artifacts (`app-definition.json` is
the full ~9MB decoded application schema; `page-content.json` is every page's
component tree pre-walked). Every other script in the pipeline reads from
these rather than re-parsing the 14.4MB bundle each time. They're checked in
for transparency and reproducibility, not because every consumer needs them —
if you only care about the recovered content, start with `page-inventory.json`,
`divya-desams/`, `articles/`, `image-map.json`, `navigation-map.json`, and
`resources/external-links.json`.

## Classification confidence

Every record in `divya-desams/` and `articles/` carries a `classification`
object with a `category`, an `evidence` object, and a `confidence` level.
None of this was inferred from page numbering or title text alone — see the
header comment in `scripts/05-classify-and-emit-records.js` for the exact,
auditable rule set. Where the evidence was genuinely ambiguous, records are
marked `unresolved_possible_divya_desam` (still written to `divya-desams/`,
but also listed in `unresolved.json`) or `unknown` (not written to either
directory) rather than guessed.

## Read next

Start with **`extraction-report.md`** for the full data-quality summary,
counts, and everything flagged for human review.
