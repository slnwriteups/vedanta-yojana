# Phase 6E — source-material import tooling

Extends (does not replace) the existing extraction/migration pipeline to
bring the two books in `source-material/Books/` into the same validated
`/content` architecture the original SAP-export migration produced.

## Why a new directory, not `scripts/migration/`

`scripts/migration/` is a protected area (Phase 6E's brief, Part 7): no
file inside it may be modified without stopping and reporting why first.
This directory is new, so it doesn't touch any protected file — but it
**reuses** `scripts/migration/text-parser.ts` (`parseTempleDetails`) and
`scripts/migration/slug.ts` (`generateSlugFromTitle`) directly via import,
rather than reimplementing the same "Details of Kshethram:" label-parsing
or slug-generation logic a second time. That is the "extend, don't
duplicate" instruction from Part 7, applied via composition instead of
modification.

## Scripts

- `extract-divyadesam-book.ts` — parses `108 Divyadesam 2nd Edition.pdf`
  (via `pdftotext -layout`, requires poppler installed locally — this is
  a one-off analysis/import tool run manually by a maintainer, not part
  of the app build, so a local-only tool dependency is acceptable here in
  a way it would not be inside `mobile/` or the Next.js app), matches
  every temple entry against the 107 existing Divya Desam records,
  classifies each field as already-present/new-supplement/conflict/
  ambiguous per the Phase 6E brief's categories A–E, merges ONLY
  unambiguous new-supplement facts into `content/divya-desams/*.json`,
  writes per-fact provenance to `content/_provenance/divya-desams/`, and
  writes a human-readable review report for every conflict/ambiguity to
  `source-material/reports/`.

- `extract-visishtadvaita-book.ts` — parses `A Brief Insight to
  Visishtadvaita Philosophy.pdf` and creates a new Book +
  Chapter records under `content/library/`, through the same schemas
  every other book already uses.

## Running

```
node scripts/source-material/extract-divyadesam-book.ts
node scripts/source-material/extract-visishtadvaita-book.ts
```

Both are idempotent against the same PDF content: re-running without
source changes produces the same output (existing content is compared,
not blindly re-appended).
