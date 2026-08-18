# /scripts

The **new** application's own scripts: the migration transformation layer
(`migration/`, below), the orchestration that walked `content-extraction/`
and wrote the real files now under `/content` (`migration/migrate-all.ts`,
already run — see Status), the Phase 6E book/PDF importers
(`source-material/`, its own README), a search-index build step
(`build-search-index.ts`), and a validation gate (`validation/`).

**This is distinct from `content-extraction/scripts/`**, which is the
already-built, deterministic Phase 3 extraction pipeline (SAP bundle →
recovered JSON) and remains untouched, permanent, and unrelated to this
directory.

## migration/

Pure transformation functions that turn a source-shaped record into a
validated destination object (`DivyaDesam`/`Book`/`Chapter`/`Knowledge`) —
`errors.ts`, `types.ts`, `slug.ts`, `text-parser.ts`, `images.ts`,
`links.ts`, `divya-desam.ts`, `book.ts`, `knowledge.ts`, `held-back.ts`,
`index.ts` (barrel export). **None of these functions read the
filesystem, the network, or `content-extraction/` directly — they only
transform in-memory data passed in as arguments.**

`migrate-all.ts` is the filesystem orchestration built on top of them:
reads real `content-extraction/divya-desams/*.json` and `articles/*.json`,
resolves the real `image-map.json`, and writes the real files now under
`/content`. It has already been run against the full source set (this is
how the 107 real Divya Desam records and the original Library book got
into `/content` in the first place) — re-running it is not part of normal
workflow and would need deliberate justification, since `/content` now
also contains hand-authored/imported material (Phase 6E, and 3 further
Library books) that a re-run does not know about and could conflict with.

This directory is treated as protected: no file inside it should be
modified without stopping and reporting why first (the same rule Phase 6E
followed by adding `scripts/source-material/` instead of touching this
directory — see that directory's own README).

## fixtures/ (Phase 5E)

`synthetic-source.ts` — builder functions for **synthetic** source-shaped
fixtures ("Example Shrine", `https://example.test/...`), used by the
migration test suite (`tests/content/migration/`). No real temple names,
prose, URLs, image UUIDs, or `sourcePageId`s appear here — see
`tests/content/migration/` for the full test suite exercising these
transformations against synthetic data only.

## Status

Migration has run to completion. `/content` now holds 107 Divya Desam
records, 4 Books (162 chapters total), and 1 Knowledge record — see
`content-lib/README.md`'s "Current /content state" for the exact
breakdown. `scripts/migration/` remains the reusable transformation layer
these functions were originally built as; `scripts/source-material/`
(Phase 6E) extended it for two book/PDF imports without modifying it,
and three further Library books were added directly under
`content/library/` afterward, following the same validated schema shape
by hand rather than through a new one-off script.
