# /scripts

Reserved for the **new** application's own scripts — the migration
transformation layer (Phase 5E, below) and, in a later phase, the
filesystem orchestration that will actually walk `content-extraction/`
and write real files under `/content`.

**This is distinct from `content-extraction/scripts/`**, which is the
already-built, deterministic Phase 3 extraction pipeline (SAP bundle →
recovered JSON) and remains untouched, permanent, and unrelated to this
directory.

## migration/ (Phase 5E)

Pure transformation functions that turn a source-shaped record into a
validated Phase 5C destination object (`DivyaDesam`/`Book`/`Chapter`/
`Knowledge`). **None of these functions read the filesystem, the network,
or `content-extraction/` — they only transform in-memory data passed in
as arguments.** That's deliberate: Phase 5F will call the exact same
`transformDivyaDesam` function against one real record (Sri Rangam) for
human review, and only after that passes will Phase 5H apply it to the
full 108-record set. The filesystem orchestration (reading real
`content-extraction/divya-desams/*.json`, resolving the real
`image-map.json`, writing real files under `/content`) does not exist yet
— that is explicitly a later phase, not this one.

```
migration/
├── errors.ts          Structured errors (slug collision, ambiguous label, missing image, unsupported resource label, link association mismatch)
├── types.ts            TypeScript shapes for source records (NOT the same as content-extraction's real types, and never imports from it)
├── slug.ts              generateSlugFromTitle(), assertNoSlugCollisions()
├── text-parser.ts        parseTempleDetails() -- the "Details of Kshethram" label parser
├── images.ts              resolveImageAsset() / resolveImageAssets() -- deterministic asset resolution
├── links.ts                Maps-link and PDF-resource transformation, explicit language/label normalization tables
├── divya-desam.ts           transformDivyaDesam()
├── book.ts                   transformBook() / transformChapter()
├── knowledge.ts                transformKnowledge()
├── held-back.ts                 holdBackUnresolvedRecord() -- preserves a record (modeling Page150) without assigning it a destination content type
└── index.ts                      barrel export
```

## fixtures/ (Phase 5E)

`synthetic-source.ts` — builder functions for **synthetic** source-shaped
fixtures ("Example Shrine", `https://example.test/...`), used by the
migration test suite (`tests/content/migration/`). No real temple names,
prose, URLs, image UUIDs, or `sourcePageId`s appear here — see
`tests/content/migration/` for the full test suite exercising these
transformations against synthetic data only.

## Status

No real migration has been executed. `/content` contains zero migrated
records. The next steps, per the corrected Phase 5A plan, are: Phase 5F
(migrate exactly one real record — Sri Rangam — using these same
functions), a human-review checkpoint, and only then Phase 5H (the full
108-record migration).
