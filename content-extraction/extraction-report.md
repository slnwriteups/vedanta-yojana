# Vedanta Yojana — Content Extraction Report (Phase 3)

This report documents the recovery of content from the legacy SAP Build Apps
export into `content-extraction/`. It is a data-quality and provenance
record, not a design document. Nothing described here has been "cleaned up"
or corrected — gaps, placeholder text, and inconsistencies found in the
source are reported as found.

## 1–4. Source identification

| | |
|---|---|
| Source repository commit | `aababc358bcf574d738bfd87e5aa435f5833ea49` (branch `main`, working tree clean before this extraction began) |
| Source bundle | `_next/static/chunks/pages/_app-72a25e792e2e05f2.js` |
| Source bundle byte size | 14,369,330 bytes (14.4 MB) |
| Source bundle SHA-256 | `fae59cee76af97c2c0d069493e1e0df2d1a4755bcca2061292d1db82ca6d3ae1` |

## 5–6. Extraction methodology and script location

The bundle is ~99% vendored library code (icon fonts, mime-db, timezone
data, HTML entity tables, etc.) plus the actual application definition,
embedded as a single JS string literal passed to `JSON.parse(...)` inside one
webpack module. This was located via a unique anchor string
(`JSON.parse('{"parserVersion"`), extracted by scanning character-by-character
for the matching (unescaped) closing quote, decoded via `new Function('return
'+literal)()` (safe: the literal is a single, pre-bounded string-literal
token, incapable of executing arbitrary statements), and `JSON.parse()`d.

Full pipeline: `content-extraction/scripts/` (`run-all.sh` orchestrates
`01`–`07`). See `content-extraction/README.md` for how to reproduce it and
`scripts/lib/decode-bundle.js` / `scripts/lib/walk-components.js` for the
core decoding/tree-walking logic, both extensively commented.

The decoded application definition (`_generated/app-definition.json`) has
this top-level shape (all 22 keys of the source schema, each already present
in the original bundle — nothing added):

`parserVersion, screens (171), components (2,435), expressions (0), logic
(events + flows), descriptorVersion, theme (82), fonts (0), assets (217),
environment (0), dataResources (0), connectorConfigurations (1),
navigation (4), i18n (2), app (3), state (0), connectedSystems (0),
cloudFunctions (0), spaProcesses (0), buildActions (0), pluginComponents (43),
globalCanvas (4)`

## 7–17. Counts

| Metric | Count |
|---|---|
| Pages found in source (`appDefinition.screens`) | 171 |
| Pages successfully parsed (component tree walked) | 171 (0 parse failures) |
| Pages flagged unresolved in some way | 11 of 171 (see §22 and `unresolved.json`) |
| Divya Desam records identified (`divya-desams/`) | 108 total — **106 high-confidence** (`divya_desam_candidate`) + **2 ambiguous** (`unresolved_possible_divya_desam`) |
| Unresolved/ambiguous temple records | 2 (`page.Page93` "Tirukoodal", `page.Page150` "Hayagriva Stotram" — see §24) |
| Non-temple content items (`articles/`) | 56 |
| Images (source asset registry) | 217 |
| Images successfully mapped to a local file | 217 of 217 (100%) |
| Ambiguous image mappings | 0 (every asset UUID maps to exactly one local file; every local file is referenced by at least one page) |
| External PDF/resource references (`Open URL` flow actions) | 552 total → 519 distinct URLs (436 `prapatti.com` sloka/stotram PDFs, 116 Google Maps location links) |
| Unresolved resource mappings | 0 — every "Open URL" action self-reports its owning `pageId`; none were dynamic/unresolvable |

## 18. Duplicate content findings

None found in text content. (The "Lorem ipsum" placeholder text — see §26 —
repeats by nature of being a filler string, but that is a completeness issue,
not duplicate *real* content.)

## 19. Duplicate image findings

One pair of byte-identical images stored under two different asset UUIDs:

- `3c76c159-5372-48be-ac49-139bc377dca3` and `dc678ea5-14cf-4c1f-989d-86471d133d6d` (same SHA-256). Not merged by this extraction — see `image-map.json` → `duplicateGroups`.

## 20. Incorrect/mislabeled asset findings

One image whose actual file format doesn't match its extension:

- `images/ac6b4755-696b-489a-8552-c4eeb5828381.jpg` is actually **GIF** data (confirmed via magic-byte sniffing, not just the extension), despite the `.jpg` name. Not renamed by this extraction — see `image-map.json` → `extensionMismatches`.

## 21. Missing/broken reference findings

- **0** images referenced by any page but missing a local file.
- **0** local image files with no corresponding asset-registry entry (no orphans).
- **0** internal "Open page" navigation edges pointing at a nonexistent page (all 164 resolve to a real screen).
- **1 structural anomaly**: pages `page.Page24`, `page.Page97`, `page.Page101` (high-confidence Divya Desam pages) are **not** among the 105 "Open page" targets listed on `page.Page3` ("108 Divyadesam", the in-app browsable list) — a user scrolling that list in the live app would not reach them this way. See `unresolved.json` → `navigation-hub-gaps`.

## 22. Page0 findings

`page.Page0` exists, titled **"Global canvas"**, with `isGlobalCanvas: true`
— this resolves the mystery flagged in the Phase 1 repository audit. AppGyver/
SAP Build Apps' "global canvas" is a platform concept for content that's
globally available across the app (e.g. shared overlays), separate from the
regular page stack. It has one `onPageDidMount` event and one root component.
**What it actually renders/does at runtime was not further decoded** — that
would require interpreting its flow-event logic or observing it live in a
browser, both out of scope for content recovery. Logged in `unresolved.json`.

## 23. Page117 findings

Confirmed absent from the source application definition itself — not merely
an export artifact. `page.Page117` does not exist in `appDefinition.screens`
and is not listed in `appDefinition.navigation.screens`. Numbering runs
...Page116, Page118... with no gap-filler. Cannot be explained from this
bundle alone (deleted during development vs. never created vs. something
else are all consistent with the evidence). Logged in `unresolved.json`.

## 24. Other structural anomalies

- **Six confirmed/likely temple pages have no Google Maps link**: `page.Page39`
  "Tirudevanaar Togai", `page.Page93` "Tirukoodal", `page.Page94`
  "Tirumaaliruncholai", `page.Page110` "Tiruparkadal (Ksheerabdi)",
  `page.Page111` "Tiruparamapadam (Sri Vaikuntham)", and `page.Page150`
  "Hayagriva Stotram". For Page110/Page111 this makes sense on its face —
  Ksheerabdi ("Ocean of Milk") and Sri Vaikuntham are not earthly, mappable
  locations in the tradition — but that reading is *our* inference, not
  something the source data states; it is not asserted as fact anywhere in
  this extraction's output.
- **`page.Page110`'s title is literally `"Tiruparkadal (Ksheerabdi)"`** —
  the only one of the 108 candidate temple titles carrying an embedded
  ordinal-number prefix. This is preserved verbatim; it is not treated as
  evidence of a reliable in-source numbering scheme (every other title has no
  such prefix).
- **Six pages contain literal "Lorem ipsum dolor sit amet" placeholder text**
  (388 individual text components across them) — see §26.
- **`page.Page3` ("108 Divyadesam") is a list/index page whose 105 navigation
  entries are fully wired (each "List item N" has a working tap→"Open page"
  action), but every one of its 216 visible text labels is unfilled "Lorem
  ipsum" placeholder text.** The navigation works; the visible labels do not
  reflect real temple names in the source as exported.
- **A live Firebase project reference exists**: `connectorConfigurations.firebase`
  contains a real project id (`vedanta-yojana-f7948`), web API key, and
  storage bucket, `enabled: true`. Not explored further (this extraction is
  about static content, not live backend behavior) — flagged here because it
  means some app behavior may depend on a live external service not captured
  by this static bundle at all.
- **An audio-narration feature exists**, not previously identified in the
  Phase 1 repository audit: flow-function actions titled `"Play audio"`,
  `"Stop audio playback"`, and `"Initialize Firebase"` were found among the
  717 flows (alongside generic `"If condition"` / `"Delay"` / `"Set page
  variable"` control-flow actions). `page.Page1` (Welcome) has a
  `pageVariables.audioSkipped` flag and a "Skip Audio" button, consistent
  with an intro voiceover. This extraction did not decode what audio file(s)
  are played or from where.
- **No maps/video/audio-player UI components are actually instantiated**
  anywhere in the app, despite AppGyver's plugin-component registry
  (`pluginComponents`, 43 entries) making `maps-v2`, `player`, `markdown`,
  `list`, `htmlView`, etc. available. Only 6 component types are ever placed
  on a page: `text` (902), `button` (557), `view` (390), `picture` (221),
  `icon` (194), `layout` (171). This is a **structural confirmation** (not a
  string-search inference, as it was in Phase 1) that there is no in-app
  map view, video player, or rich/markdown text rendering anywhere in the
  current source — travel-planning functionality, if any exists, is limited
  to the 116 outbound Google Maps links (see §17).
- **`connectorConfigurations` / `app` config also reveals**
  `"showSubscriptionVerificationNotification": false` — meaning the "made
  with SAP Build Apps, subscription could not be verified" warning banner
  string found in Phase 1 is present in the bundle but configured **not** to
  display, refining Phase 2's speculation that a visitor would "very likely"
  see it.

## 25. What was successfully recovered

- All 171 source pages' structural facts (`page-inventory.json`).
- Full ordered content (text/button/picture/icon component trees, in source
  order) for every page that has any (`divya-desams/*.json`, `articles/*.json`).
- 108 Divya-Desam-candidate page records, including real body text where
  present (e.g. `page.Page5` "Sri Rangam" has a substantial "Sthala Puranam"
  narrative; the actual Divya Desam definition/overview paragraph and
  regional-count breakdown found in Phase 1 was traced to its real home,
  `page.Page4` "Introduction", not the "108 Divyadesam" index page).
- Complete `ag-asset://UUID → /images/UUID.ext` mapping for all 217 images,
  with per-page/per-component reference lists, cross-checked for duplicates
  and mislabeled extensions.
- All 552 outbound "Open URL" actions (PDFs + Google Maps links), each tied
  to its source page, source component, and (where derivable) surrounding
  button/link label text.
- The real internal navigation graph (164 page-to-page "Open page" actions),
  not the app's declared `navConfig.screens` list (which is just a flat
  roster, not a graph).

## 26. What could not be recovered

- **Real content for 6 pages is missing from the source itself** — it was
  never finished in the original SAP Build Apps project, not lost by this
  extraction:
  - `page.Page3` "108 Divyadesam" (216 placeholder text blocks; only its
    navigation wiring is real)
  - `page.Page112` "Visishtadvaita Philosophy" — **no real text content at
    all** (only placeholder)
  - `page.Page115` "Mahabharatam" — no real text content at all
  - `page.Page116` "Ramayanam" — no real text content at all
  - `page.Page127` "Guru Parampara" (68 placeholder blocks, some real content present)
  - `page.Page163` "Charama Shlokams" (6 placeholder blocks, some real content present)
  - `page.Page168` "Srimad Bhagavatham" (58 placeholder blocks, some real content present)

  Note this **corrects/refines** the Phase 1 repository audit, which listed
  "Visishtadvaita Philosophy," "Mahabharatam," and "Ramayanam" as recovered
  philosophy content based on their titles appearing in a raw string search
  of the bundle. Structured extraction shows those three pages exist and are
  titled, but contain no finished body text — the title alone was what Phase
  1's grep found.
- **`page.Page0`'s actual runtime behavior** (see §22).
- **Why `page.Page117` doesn't exist** (see §23).
- **What audio file(s) play and from where** (flow-function inputs for "Play
  audio" were not decoded — out of scope for this content-recovery pass).
- **The true identity of `page.Page93` and `page.Page150`** as temple vs.
  non-temple content (see §24, §27).
- Your own book/written-work content — **still not present anywhere in this
  source**, consistent with the Phase 1 finding. This extraction recovers
  what the old app contains; it does not create content that was never there.

## 27. What requires human review

1. **`page.Page93` ("Tirukoodal") and `page.Page150` ("Hayagriva Stotram")** —
   both have a prapatti.com sloka PDF link (like the 106 confirmed Divya
   Desam pages) but lack both a Google Maps link and hub-list membership.
   `page.Page93`'s title reads like a real place name; `page.Page150`'s does
   not. A human familiar with the 108 Divya Desams should confirm whether
   `page.Page93` is genuinely the 108th (or Nth) temple missing its map link,
   and confirm `page.Page150` is indeed a standalone stotram, not a temple.
2. **The 6 pages with only placeholder content** (§26) — decide whether to
   source real content for them from elsewhere, or treat them as not-yet-written.
3. **The 3-page gap in `page.Page3`'s browsable list** (`Page24`, `Page97`,
   `Page101` — §24) — confirm whether these are reachable in the live app by
   some other means, or were simply never linked.
4. **The live Firebase project** (`vedanta-yojana-f7948`) — worth checking
   whether it holds any data (e.g. user accounts, dynamic content, analytics)
   relevant to migration that this static-bundle extraction cannot see.
5. **The one duplicate image pair and one mislabeled (GIF-as-.jpg) image**
   (§19–20) — decide how to handle during content modeling; not fixed here.

---

*Generated as part of Phase 3 (Content Recovery & Extraction). This document
itself is hand-written, not machine-generated by the pipeline, so unlike the
JSON files it is not expected to be byte-identical across pipeline reruns —
but every number in it was read directly from this run's generated JSON
output, not estimated.*
