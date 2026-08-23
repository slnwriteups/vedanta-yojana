# Vedanta Yojana — Engineering Documentation

## Scope and evidentiary standard

This document is a technical and historical record of the Vedanta Yojana
project: what it is, how it is built, how it evolved, and how it can be
reproduced and maintained. It is written for engineers — developers,
technical reviewers, and future maintainers who have no prior exposure to
this repository or to the development sessions that produced it.

Every factual claim below falls into one of four evidentiary categories,
labeled explicitly wherever the distinction matters:

- **CONFIRMED** — directly verified against a file, commit, or command
  output in this repository at the time of writing, with a citation
  (path, commit hash, or command).
- **PROBABLE** — strongly implied by repository evidence but not directly
  observed (e.g., inferred from a config change without a corroborating
  test log).
- **INVESTIGATED / RULED OUT** — a factor that project history shows was
  examined during troubleshooting and determined not to be the root
  cause.
- **REPORTED BY PROJECT OWNER, NOT INDEPENDENTLY VERIFIABLE** — asserted
  by the person who did the work firsthand, describing events from a
  development session with no artifact trail in the repository (transient
  terminal output, local machine state, physical-device tests). These are
  included because they are part of the project's real history and the
  project owner is a direct witness to them, but they carry a different
  evidentiary weight than a citable file or commit, and are marked as
  such rather than silently presented as independently confirmed.

Where a specific claim could not be placed in any of these categories
with confidence, this document says so explicitly rather than filling
the gap with plausible-sounding detail.

---

## 1. Development model

**Vedanta Yojana was designed and built by a first-time application
developer, working with an AI system (Claude, via Claude Code) as the
primary development and engineering assistant.** This is stated
explicitly and is not a detail to be softened into generic language like
"AI-assisted development." It is a defining characteristic of how this
codebase came to exist, and it shapes how the rest of this document
should be read — as a record of an iterative human-AI development
process, not as the output of an experienced solo engineer or a
traditional team.

### Division of responsibility

| | Owned by the developer | Owned by the AI |
|---|---|---|
| Project vision and purpose | ✓ | |
| Requirements and priorities | ✓ | |
| Content decisions (what books, what translations, what quality bar) | ✓ | |
| Translation standards and approval | ✓ | |
| Architectural direction (what to build next) | ✓ | |
| Final acceptance of any change | ✓ | |
| Testing decisions (what to verify, when to accept a build) | ✓ | |
| Software architecture exploration and proposals | | ✓ |
| Code generation and modification | | ✓ |
| Debugging, root-cause investigation, dependency analysis | | ✓ |
| Build-failure interpretation | | ✓ |
| Translation drafting and mechanical QC | | ✓ |
| Documentation generation | | ✓ |
| Command-line operation (git, npm, gradle, adb, gh) | | ✓ |

The AI was not an autonomous engineer operating without oversight. Every
commit in this repository's history represents a change the developer
requested, reviewed at some level, and accepted into the project — the
AI proposed, implemented, and validated; the developer directed and
approved. The workflow that produced this repository is described in
detail in Section 6.

---

## 2. What the application is

Vedanta Yojana is a content application presenting Hindu devotional and
philosophical material — Divya Desam temple records, translated
scripture and philosophy books, and a general knowledge/introduction
record — across two runtimes:

- A **Next.js website**, the original and now legacy/maintenance-only
  runtime, deployed to Vercel from the repository root.
- An **Expo (React Native) mobile app** for iOS and Android, under
  `mobile/`, which per the project's own documentation is "the real,
  active target" for new feature work (`mobile/README.md`).

Both runtimes read from a single shared content layer rather than
maintaining independent copies of any editorial material.

### Why the project exists — CONFIRMED

The content did not originate as new authorship. It was recovered from a
legacy SAP Build Apps (a no-code platform) export that exists at the
repository root (`_next/`, `page.Page*.html`, `nodered.min.js`, and
related files) — a working but unmaintainable application whose actual
content (108 Divya Desam temple pages, 56 philosophy/scripture article
pages, 217 images, and 552 external resource links) was compiled and
buried inside a single 14.4MB minified JavaScript bundle
(`_next/static/chunks/pages/_app-72a25e792e2e05f2.js`), per
`content-extraction/README.md`. That content had no independently
readable, versionable, or maintainable form outside the legacy runtime.

The project's founding technical objective — confirmed by the existence
and design of `content-extraction/` — was to recover that content into
clean, structured, schema-validated JSON that could survive independently
of the SAP Build Apps runtime, and then build a real, maintainable
application on top of it. `content-extraction/` is explicitly a
**read-only migration artifact**: every script in it only reads the
legacy export; nothing in the current application touches the legacy
export directly.

The specific motivation for *why this particular content* — Divya Desam
temple records, Vedantic philosophy, and itihasa/purana translations —
was chosen for revival is **REPORTED BY PROJECT OWNER, NOT INDEPENDENTLY
VERIFIABLE**: it reflects the project owner's own devotional and cultural
interest, not a fact reconstructible from repository artifacts alone.

---

## 3. Technology stack — CONFIRMED

All versions below were read directly from the installed dependency
manifests (`package.json`, `mobile/package.json`, `mobile/package-lock.json`,
`mobile/android/gradle/wrapper/gradle-wrapper.properties`) and, where
noted, cross-checked against the actual installed package in
`node_modules`.

### Website (repository root)

| Component | Version | Notes |
|---|---|---|
| Next.js | 16.3.0 | App Router |
| React / React DOM | 19.2.8 | |
| TypeScript | 7.0.2 | |
| Zod | ^4.4.3 | Content schema validation |
| Node.js | 24 (`.nvmrc`) | Active shell verified at `v24.3.0` |

### Mobile (`mobile/`)

| Component | Version | Notes |
|---|---|---|
| Expo SDK | ~53.0.27 | |
| Expo Router | ~5.1.11 | File-based navigation, see §5.3 |
| React Native | 0.79.6 | |
| React | 19.0.0 | |
| Hermes | enabled (`hermesEnabled=true`, `mobile/android/gradle.properties`) | JS engine |
| New Architecture | enabled (`newArchEnabled=true`) | TurboModules/Fabric |
| Zod | ^4.4.3 | Same schema package as the website, imported directly |
| TypeScript | ~5.8.3 | |
| patch-package | ^8.0.1 | See §7.3 |
| Gradle (wrapper) | 8.13 (`gradle-wrapper.properties`) | |
| glob (resolved, used by expo-modules-autolinking) | 10.5.0 (`mobile/node_modules/glob/package.json`) | See §7.3 |
| expo-modules-autolinking | 2.1.15 | Patched, see §7.3 |

### Android native build environment — CONFIRMED

| Component | Value | Source |
|---|---|---|
| Gradle | 8.13 | `mobile/android/gradle/wrapper/gradle-wrapper.properties` |
| JDK pinned for the Gradle daemon | OpenJDK 17 (Homebrew, `/opt/homebrew/opt/openjdk@17`) | `mobile/android/gradle.properties`, `org.gradle.java.home` |
| Native project generation | Expo prebuild (`expo-root-project` Gradle plugin; `mobile/android/build.gradle` contains no hand-authored `compileSdkVersion`/`buildToolsVersion` values — they are supplied by the Expo plugin) | `mobile/android/build.gradle` |
| React Native architectures targeted | `armeabi-v7a, arm64-v8a, x86, x86_64` | `mobile/android/gradle.properties` |

The choice of each of these technologies, and why alternatives were or
were not considered, is discussed in Section 8.

---

## 4. Repository architecture — CONFIRMED

```
vedanta-yojana/
├── app/, components/, lib/         Website (Next.js, App Router) — legacy/maintenance
├── mobile/                          Mobile app (Expo/React Native) — the active target
│   ├── app/                         Expo Router routes (file-based)
│   ├── components/                  Mobile-specific UI components
│   ├── content-lib/                 Mobile content bridge (generated manifest + loader)
│   ├── android/                     Expo-prebuilt native Android project
│   ├── patches/                     patch-package patches applied on every npm install
│   ├── scripts/                     generate-content-manifest.ts and similar tooling
│   └── tests/                       Node-native test suite (no Jest)
├── content/                         The validated content layer (JSON) — single source of truth
│   ├── divya-desams/                107 Divya Desam temple records
│   ├── library/                     4 books, organized as book.json + chapters/*.json
│   ├── knowledge/                   1 standalone knowledge/introduction record
│   ├── _provenance/                 Migration provenance metadata (source page mapping)
│   └── _unresolved/                 Content that could not be confidently migrated
├── content-lib/                     Shared schemas, loader, search, and i18n — used by both runtimes
│   ├── schemas/                     Zod schemas (single source of truth for validation + types)
│   ├── loader/                      Reads /content, validates every file, returns typed objects
│   ├── search/                      Framework-agnostic search (no node:fs — runs on mobile too)
│   └── i18n.ts                      localize*() — applies translations[language] over the English base
├── content-extraction/              Read-only recovery pipeline from the legacy SAP Build export
├── scripts/                         Migration/import tooling that built /content
├── source-material/                 Source PDFs/books and their import reports
├── tests/                           Website test suite (content-lib + app layer)
└── DOCUMENTATION.md                 This file
```

The content/code separation rule stated in `content-lib/README.md` is
architecturally load-bearing, not a style preference: `app/` and
`components/` (website) and `mobile/app/` (mobile) are only ever supposed
to receive typed, validated content objects produced by `content-lib/` —
never to read `/content` directly, and never to contain hardcoded
recovered content.

---

## 5. System architecture

### 5.1 Content pipeline (both runtimes)

```
content/  (JSON, Git-tracked, hand/AI-edited)
    ↓  read + validated by
content-lib/  (Zod schemas + loader — shared, unmodified between runtimes)
    ↓  consumed by
app/  (website)          or          mobile/app/  (Expo Router)
    ↓                                     ↓
Next.js build / Vercel              Metro bundle / Gradle / APK
    ↓                                     ↓
Browser                              Android/iOS device
```

Neither runtime is permitted to read `/content` directly; both go
through `content-lib/`. This is enforced structurally on the website by
Next.js's bundler, which refuses to bundle `node:fs` into a Client
Component — an accidental client-side import of the loader fails the
build on its own, without a separate lint rule (`content-lib/README.md`).

### 5.2 Website runtime — CONFIRMED (`content-lib/README.md`, `content-lib/loader/index.ts`)

The website's loader (`content-lib/loader/index.ts`) reads `/content`
from disk with `node:fs` **at request time**, synchronously. There is no
caching layer beyond what synchronous reads of small JSON files naturally
imply — content volume has not yet justified one. This means a content
edit is visible on the website immediately, without a rebuild.

Public API (identical function signatures used by both runtimes):

```ts
loadDivyaDesams(): DivyaDesam[]        loadDivyaDesam(slug): DivyaDesam | null
loadBooks(): Book[]                     loadBook(slug): Book | null
loadChapters(bookSlug): Chapter[]       loadChapter(bookSlug, slug): Chapter | null
loadKnowledge(): Knowledge[]            loadKnowledgeRecord(slug): Knowledge | null
```

Not-found convention: every single-record lookup returns `null` (never
`undefined`, never throws); every collection lookup returns `[]` for an
empty or nonexistent directory. Thrown errors are reserved for genuine
content defects — malformed JSON, a schema failure, a duplicate slug, or
a duplicate chapter `order` within one book — and always identify the
offending file path (`content-lib/loader/errors.ts`).

Slug-based lookups never build a filesystem path from caller-supplied
input; a requested slug is matched in memory against each record's own
already-validated `slug` field, and a malformed/malicious slug (e.g.
`"../../etc/passwd"`) is rejected by a format check before any filesystem
access occurs.

### 5.3 Mobile runtime — CONFIRMED (`mobile/README.md`, `mobile/metro.config.js`)

The mobile app cannot use the website's approach, because Metro (React
Native's bundler) has no runtime filesystem to lazily read `/content`
from the way a Node server does — it needs statically analyzable `import`
statements resolved at **bundle time**. The mobile content bridge is
three pieces, all confirmed present in the repository:

1. **`mobile/metro.config.js`** extends Metro's `watchFolders` to include
   `content/`, `content-lib/`, `public/images/`, and `public/audio/` at
   the repository root — by default Metro only sees files under
   `mobile/`, so without this, any import reaching above `mobile/` fails
   to resolve. It also extends `resolver.nodeModulesPaths` to include the
   repo root's `node_modules`, because `content-lib/schemas` imports
   `zod`, and `content-lib/` is a sibling of `mobile/` rather than an
   ancestor — ordinary upward `node_modules` resolution from a file
   inside `content-lib/` never reaches `mobile/node_modules`. The file's
   own comments record that this was **verified empirically**: without
   the added resolver path, `npx expo export` fails with `Unable to
   resolve module zod from .../content-lib/schemas/shared.ts`, reporting
   that it checked only `content-lib`'s own immediate `node_modules`, not
   the repository root's. `zod` is also installed directly in
   `mobile/package.json` as a belt-and-braces measure, not as a hidden
   dependency on the website's tree.

2. **`mobile/scripts/generate-content-manifest.ts`** enumerates the real
   `/content` tree once and emits `mobile/content-lib/manifest.generated.ts`
   — a file containing only `import` statements pointing at the real
   content files, plus arrays referencing those imports. **No content is
   copied**; the generated file is glue code, comparable to a lockfile.
   It also emits `mobile/content-lib/image-manifest.generated.ts`,
   mapping each record's `sourceAssetUuid` to a `require(...)` of the
   real image file under `public/images/`, so Metro's own asset pipeline
   (hashing, cache-busting, bundling) handles images without a custom
   route handler.

   This generated manifest is a **build-time snapshot, not a live read**.
   Editing, adding, or removing anything under `/content` has no effect
   on the mobile app until the script is re-run — the failure mode when
   this step is forgotten is silent: new content appears correctly on
   the website but not in the mobile app, with no error to point at why.
   This was hit in practice and fixed in commit `9634f56`
   ("Regenerate mobile content manifest for the 3 new Library books") —
   the manifest had not picked up three newly added books because it is
   a static snapshot, not a live filesystem read.

3. **`mobile/content-lib/loader.ts`** is the mobile-compatible content
   access layer, exposing the identical public API as the website loader
   and validating every record through the **same Zod schemas**
   (imported directly from `content-lib/schemas/index.ts`, not
   reimplemented) and the same error classes. The one deliberate,
   disclosed difference: this loader **caches** its parsed/validated
   results after the first call, because the mobile manifest is compiled
   into the app binary at build time and cannot change at runtime — the
   website loader explicitly does not cache, because its `/content` can
   change underneath it between requests on a dev server. This is
   documented in `mobile/README.md` as a deliberate adaptation, not an
   oversight.

Two additional build-specific gotchas are documented in
`mobile/README.md` and are reproduced here because they materially
affect anyone touching the content bridge:

- **JSON import attributes**: every generated import uses
  `with { type: "json" }` (e.g. `import dd_sriRangam from
  "../../content/divya-desams/sri-rangam.json" with { type: "json" }`).
  Node's native ESM loader (used by `node --test` for `mobile/tests/`)
  requires this attribute and fails immediately with
  `ERR_IMPORT_ATTRIBUTE_MISSING` without it. Metro does not require the
  attribute for its own JSON handling but parses and ignores it without
  error — so one generated line works correctly under both runtimes.
  Verified by running both `node --test mobile/tests/loader.test.ts` and
  `npx expo export` against the same generated file.
- **`tsconfig.json` performance**: `mobile/tsconfig.json` explicitly sets
  `"resolveJsonModule": false`, overriding `expo/tsconfig.base`'s default
  of `true`. With it on, `tsc` infers a full precise literal type from
  every imported JSON file's actual content; across 160+ content imports,
  some containing long prose bodies, this made `tsc --noEmit` take
  minutes. Every JSON import is instead typed `unknown` and immediately
  validated by the real Zod schema in `loader.ts`. This reduced
  `tsc --noEmit` to about a second and has no effect on Metro/Babel's
  actual JSON bundling at runtime, which is a separate mechanism from
  `tsc`'s static type-checking.

### 5.4 Why Expo Router, not plain React Navigation — CONFIRMED (`mobile/README.md`)

Two reasons are recorded as having actually driven the decision:

1. It mirrors the routing model already established by the Next.js
   reference app — an `app/` directory, file-based routes, a root
   layout — so a developer who understands the website's
   `app/divya-desams/[slug]/page.tsx` already understands what
   `mobile/app/(tabs)/divya-desams/[slug].tsx` looks like, without
   learning a second routing model.
2. Expo Router is not a competitor to React Navigation; it is a
   file-based routing convention built on top of it (`mobile/package.json`
   installs `react-native-screens`/`react-native-safe-area-context` as
   Expo Router's own peer dependencies). Choosing Expo Router gets React
   Navigation's navigator/gesture/screen primitives "for free," authored
   via the file-based convention.

No other navigation library is recorded as having been evaluated as a
real alternative.

### 5.5 Mobile route map — CONFIRMED (directory listing)

```
mobile/app/_layout.tsx                                  root layout
mobile/app/(tabs)/_layout.tsx                            tab navigator
mobile/app/(tabs)/index.tsx                               Home
mobile/app/(tabs)/divya-desams/_layout.tsx
mobile/app/(tabs)/divya-desams/index.tsx                  Divya Desams — index (107 records)
mobile/app/(tabs)/divya-desams/[slug].tsx                 Divya Desams — detail
mobile/app/(tabs)/divya-desams/introduction.tsx            Divya Desams — introduction (Knowledge record)
mobile/app/(tabs)/library/_layout.tsx
mobile/app/(tabs)/library/index.tsx                        Library — index (all books)
mobile/app/(tabs)/library/[book].tsx                        Library — book screen
mobile/app/(tabs)/library/[book]/[chapter].tsx                Library — chapter reader
mobile/app/(tabs)/search.tsx                                Offline search (content-lib/search/)
mobile/app/(tabs)/settings.tsx                              Theme, reading preferences, language
```

Supporting providers (`mobile/`): `LanguageProvider.tsx`,
`ThemeProvider.tsx`, `ReadingPreferencesProvider.tsx`. Shared components:
`ContentCard`, `ContentImage`, `DraftBadge`, `ImageViewerModal`,
`OnboardingScreen`, `ResourceLink`, `Section`, `SettingsControls`,
`SthalaPuranamWithImages`, `WelcomeScreen`.

**Translations are live only on mobile, not on the website.**
`content-lib/i18n.ts`'s `localize*()` functions, which overlay a record's
`translations[language]` field-by-field onto its English base, are
called from the mobile Divya Desam and Library screens via
`LanguageProvider`. The website's `app/` never calls these functions —
the i18n data exists in `/content` for both runtimes, but only the
mobile UI currently surfaces it.

### 5.6 Content data model — CONFIRMED (direct inspection of representative records)

Two record shapes coexist in `/content`, validated by separate Zod
schemas (`content-lib/schemas/book.ts`, `chapter.ts`, `divya-desam.ts`,
`knowledge.ts`, all built on shared primitives in `shared.ts`):

**Book/Chapter** (`content/library/<book-directory>/book.json` +
`chapters/*.json`):

```json
{
  "title": "string",
  "slug": "string",
  "order": "number",
  "status": "draft | published",
  "migration": {
    "sourcePageId": "string",
    "extractionConfidence": "high | medium | low",
    "needsReview": "boolean"
  },
  "body": "string (source-language prose)",
  "images": ["..."],
  "translations": {
    "ta": { "title": "string", "body": "string" },
    "kn": { "title": "string", "body": "string" },
    "hi": { "title": "string", "body": "string" }
  }
}
```

A book's identity for every lookup is its **validated `slug` field**
inside `book.json`, never the directory name — the loader never infers
or rewrites a slug from a directory, which is what allows two book
directories with a colliding slug to be correctly detected and rejected
as a duplicate-slug error rather than silently prevented from coexisting
in the first place (`content-lib/README.md`). Chapters are ordered by
their own `order` field, never by filename; duplicate `order` values
within one book throw rather than silently picking a winner.

**Divya Desam** (`content/divya-desams/<slug>.json`), a richer shape:
`slug`, `displayName`, `status`, `migration`, `templeInformation`,
`sthalaPuranam`, `azhwarPasuram`, `shrines`, `images`, `resources`,
`relatedContent`, `translations` (fields confirmed by direct inspection
of `content/divya-desams/sri-rangam.json` and `tirupperai.json`).

Schema-level guarantees enforced by `content-lib/schemas/` and stated
explicitly in `content-lib/README.md`: `status` defaults to `"draft"`
everywhere (no schema defaults to `"published"`); extraction confidence
never influences `status`; every optional field really is optional
(tolerating legitimate source gaps such as a Divya Desam with no
`sthalaPuranam`); image `alt` text is never fabricated
(`alt: string | null`, `altStatus` defaults to `"needs-review"`); and the
same image asset may legitimately appear on more than one record.

### 5.7 Current content inventory — CONFIRMED (direct count, 2026-08-21)

| Collection | Count | Location |
|---|---|---|
| Divya Desam records | 107 | `content/divya-desams/` |
| JAYA: A Journey of the Mahabharata | 69 chapters | `content/library/jaya/` |
| Sri Rama Charithram | 7 chapters | `content/library/sri-rama-charithram/` |
| Srimad Bhagavata Kathasagaram | 31 chapters | `content/library/srimad-bhagavata-kathasagaram/` |
| A Brief Insight to Visishtadvaita Philosophy | 51 chapters | `content/library/untitled-recovered-book-pending-editorial-title/` |
| Knowledge records | 1 | `content/knowledge/` |
| **Total** | **266 content records** | |

The Visishtadvaita book originally migrated with 55 chapters; 4 were
later identified as misplaced and removed (commit `0ada4a7`, "Remove 4
misplaced chapters from A Brief Insight to Visishtadvaita Philosophy,
finalize status to published"), leaving the current 51. Some existing
project documentation (`content-lib/README.md`, `content/README.md`)
still states the pre-existing figures of 55 chapters and 162 total
chapters — those files were not updated at the time this document was
written and should not be treated as current; the counts above are a
direct, current recount.

---

## 6. The AI-assisted development workflow

The commit history and commit messages in this repository are consistent
with an iterative loop, not one-shot code generation:

```
Developer states a requirement or reports a problem
        ↓
AI investigates the relevant code/config/build output
        ↓
AI proposes an approach (occasionally more than one, for the developer to choose)
        ↓
Developer approves / redirects
        ↓
AI implements the change
        ↓
Build and/or test run (npm test, tsc, gradlew, expo export, etc.)
        ↓
   ┌─── failure ───┐
   ↓               ↓
AI diagnoses    success
error output        ↓
   ↓            Developer reviews the actual change
AI revises          ↓
   ↓            Git commit (with a message documenting what and why)
   └──────┐         ↓
          └──→  Push to the shared remote
```

This pattern is directly visible in commit messages that describe not
just a change but the investigation behind it — for example, commit
`d741ac3` ("Library audit: flag 3 chapters whose source is genuinely
incomplete") describes re-verifying 55 chapter bodies byte-for-byte
against their extraction source, re-running a 17-chapter PDF
correspondence check, and explicitly recording one finding it
investigated and *chose to leave unchanged* (a pixel-identical image
shared correctly by two unrelated chapters) rather than "fixing" it
against a false assumption. Commit `5033638` (the autolinking fix,
detailed in §7.3)
similarly documents a specific chain of ruled-out hypotheses before
reaching a confirmed root cause, rather than presenting the fix as
self-evident.

The translation work documented in Section 9
follows the same loop at a per-chapter granularity: translate → run a
mechanical validation script (paragraph-count parity, a regex check for
a known gloss-duplication bug) → report status → commit in small batches
→ push → periodically run a broader consistency pass across completed
work.

What this workflow is **not**: the AI did not operate unsupervised
against a backlog, did not choose what to build next on its own
initiative, and did not merge or publish its own work without the
developer's session being the one to invoke each action. Every git push
in this project's history occurred as part of a session directed by the
project owner.

---

## 7. Android build pipeline and troubleshooting history

This section documents the Android native build chain and the specific
problems encountered getting a working debug and release build. Each
subsection states its evidentiary category up front.

### 7.1 Build pipeline overview — CONFIRMED

```
TypeScript/TSX source (mobile/app/, mobile/components/)
        ↓  Metro (dev server, or `expo export`/`export:embed` for a release bundle)
JavaScript bundle (Hermes bytecode at runtime)
        ↓
React Native / Expo native modules, autolinked into the Android project
        ↓  Gradle (8.13, JDK 17 pinned)
        ↓  ./gradlew assembleDebug   or   ./gradlew assembleRelease
APK (mobile/android/app/build/outputs/apk/debug/ or .../release/)
        ↓  adb install, or sideload
Android device
```

The native Android project under `mobile/android/` is Expo-generated
(`expo prebuild`), not hand-authored: `mobile/android/build.gradle`
applies the `expo-root-project` plugin and contains no explicit
`compileSdkVersion`/`buildToolsVersion` — those are supplied by the
plugin rather than pinned in this repository.

### 7.2 JDK / Gradle compatibility — CONFIRMED

**Problem.** Gradle 8.13 (this project's wrapper version) does not
support arbitrarily new JDKs. The failure mode for an unsupported JDK is
a class-file version mismatch.

**Root cause, as recorded directly in `mobile/android/gradle.properties`:**

> "Pin the JDK Gradle 8.13 actually supports. Without this, Gradle
> resolves whatever `java` is first on PATH/`java_home`, which on this
> machine is Homebrew's `openjdk@24` (unsupported by Gradle 8.13,
> `Unsupported class file major version 68`) rather than `openjdk@17`."

**Fix, CONFIRMED in the same file:**

```properties
org.gradle.java.home=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
```

This pins the Gradle daemon's JVM explicitly, independent of whatever
`java` resolves to on the developer machine's `PATH`/`JAVA_HOME`. This is
a project-level, repository-committed fix — any machine that clones this
repository and has `openjdk@17` installed at that Homebrew path will
build correctly regardless of what other JDKs are also installed.

### 7.3 The `expo-modules-autolinking` hang — CONFIRMED

This is the most significant build-pipeline defect encountered and fixed
in this project's history, and it is documented here in full technical
detail because the fix is non-obvious and could otherwise be reverted by
a future dependency upgrade without anyone understanding why it exists.

**Symptom.** Android builds (`./gradlew assembleDebug` and the autolinking
commands Gradle depends on, `react-native-config` and `resolve`) hung
indefinitely — no forward progress, no error, no timeout.

**Root cause, as recorded in commit `5033638`'s message:**

`expo-modules-autolinking@2.1.15`'s `fileUtils.js` used the streaming
form of the `glob` package (`glob.stream()`) consumed with a
`for await (...)` loop to scan each dependency's `android/` directory
for autolinking purposes. Under this project's specific dependency tree
(`glob` resolved to version **10.5.0** — confirmed directly at
`mobile/node_modules/glob/package.json`), this consistently hung with
near-zero CPU usage and no output.

**Investigation, per the fix commit's own description (INVESTIGATED /
RULED OUT):** the commit message states the hang was confirmed via a
Node diagnostic report to be an unresolved Promise with no pending libuv
handles, and that the hang occurred *"regardless of Node version, Gradle
presence, disk space, or `UV_THREADPOOL_SIZE`."* This means each of those
four factors was specifically tested as a candidate explanation and
ruled out — the hang was not caused by an old/new Node runtime, was not
specific to a particular Gradle invocation, was not caused by low disk
space, and was not fixed by increasing libuv's thread-pool size (a
plausible hypothesis for a stalled async filesystem operation, tested
and eliminated).

Two further specifics reported by the project owner from this
investigation session are **REPORTED BY PROJECT OWNER, NOT INDEPENDENTLY
VERIFIABLE** from repository artifacts alone (they describe transient
local-machine state and terminal output that leaves no file trace): that
disk utilization on the development machine was at approximately 98% of
an APFS volume with roughly 9.6 GB free at the time, that a subsequent
cleanup recovered approximately 39.4 GB (leaving roughly 49 GB free),
and that macOS Spotlight indexing (`mdworker` activity) was independently
investigated as a possible contributor to system-level slowness during
the same troubleshooting window. Both are consistent with — but not
proof of — the commit message's own statement that disk space was
investigated and ruled out as the hang's cause: the hang persisted
regardless of available disk space, which is exactly what a large
cleanup that did *not* fix the problem would demonstrate. Neither disk
space nor Spotlight is the confirmed root cause; the confirmed root
cause is the `glob.stream()`/`for await` code path itself.

**Fix, CONFIRMED via `git show 5033638`:** `mobile/patches/expo-modules-autolinking+2.1.15.patch`,
applied automatically after every `npm install` via `patch-package`
(`"postinstall": "patch-package"` in `mobile/package.json`), rewrites two
functions in `node_modules/expo-modules-autolinking/build/fileUtils.js`
to use the array-returning `glob()` API instead of `glob.stream()`:

```diff
-    const globStream = glob_1.glob.stream(globPattern, { ...options, withFileTypes: false });
+    const files = await (0, glob_1.glob)(globPattern, { ...options, withFileTypes: false });
     const cwd = options?.cwd !== undefined ? `${options.cwd}` : process.cwd();
     const results = [];
-    for await (const file of globStream) {
+    for (const file of files) {
```

(applied to both `globMatchFunctorAllAsync` and
`globMatchFunctorFirstAsync` in that file). This preserves identical
matching semantics — the same glob pattern, the same result set — while
removing the stream/async-iterator lifecycle that was hanging.

**Why `patch-package` rather than any of the alternatives:**

| Alternative | Why not used |
|---|---|
| Downgrade/upgrade `expo-modules-autolinking` | Not recorded as tried; the defect is in a specific code path unrelated to the package's version-appropriateness for the Expo SDK in use — changing the version was not needed once the actual code path causing the hang was identified. |
| Fork and depend on a patched package | Adds a permanent external maintenance burden (a separate package to publish and keep in sync) for a two-function change. |
| Manually edit `node_modules` after each install | Not durable — `node_modules` is not committed, and any fresh `npm install` (a new clone, CI, a teammate's machine) would silently lose the fix and reintroduce the hang with no error message pointing at why. |
| `patch-package` (selected) | The patch file itself is committed (`mobile/patches/`), applied automatically via the `postinstall` script on every `npm install`, and fails loudly if the patched package's source no longer matches what the patch expects (protecting against a silent, stale patch after a future dependency upgrade). |

**Validation, CONFIRMED in the commit message:** both real autolinking
commands (`react-native-config`, `resolve`) were verified to complete in
approximately 3 seconds after the patch (previously never completing),
and `./gradlew assembleDebug` was verified to succeed end to end.

### 7.4 Metro / release bundle resolution — CONFIRMED

A second, distinct build-pipeline defect involved Metro's module
resolution for the content bridge described in
§5.3. As recorded directly in
`mobile/metro.config.js`'s comments, running `npx expo export` (the
release-bundle export path) without the `resolver.nodeModulesPaths`
extension failed with:

```
Unable to resolve module zod from .../content-lib/schemas/shared.ts
```

because Metro's default upward `node_modules` resolution from a file
inside `content-lib/` (a sibling of `mobile/`, not an ancestor) never
reaches `mobile/node_modules`. The fix — extending
`config.resolver.nodeModulesPaths` to explicitly include the repository
root's `node_modules` alongside `mobile/`'s own — is confirmed present
in the shipped `metro.config.js` and is stated in its comments to have
been verified empirically by re-running `expo export` against the fix,
not merely assumed to work.

The broader `watchFolders` extension (content, content-lib, images,
audio — see §5.3) is the same category of
fix: Metro only bundles/watches files under its configured
`watchFolders`, and without this configuration, any release bundle
attempting to import content from outside `mobile/` would fail to
resolve, not merely a dev-server import.

### 7.5 Debug and release APKs — CONFIRMED (build outputs) / REPORTED (device testing)

Both build variants exist in the working tree (not committed — excluded
by `mobile/.gitignore`'s `/android` rule, which excludes the entire
Expo-generated native project directory from version control, consistent
with treating it as a regenerable build artifact rather than source):

| Variant | Path | Size |
|---|---|---|
| Debug | `mobile/android/app/build/outputs/apk/debug/app-debug.apk` | 145 MB |
| Release | `mobile/android/app/build/outputs/apk/release/app-release.apk` | 116 MB (122,059,005 bytes) |

Both were successfully built end to end, which by itself CONFIRMS the
JDK/Gradle fix (§7.2), the
autolinking fix (§7.3),
and the Metro resolution fix (§7.4)
all hold in combination — a release build specifically requires the
`export:embed`/bundle step that the Metro fix addresses, in addition to
the Gradle/autolinking chain the debug build alone would exercise.

Installation and interactive testing on a physical Android device
(reported as a Samsung Galaxy S10, via `adb install`) is **REPORTED BY
PROJECT OWNER, NOT INDEPENDENTLY VERIFIABLE** — there is no artifact in
the repository (a test log, a screenshot, a recorded `adb logcat`
session) that independently confirms which physical device was used or
what was observed on it. The existence of a successfully built,
non-trivially-sized release APK is consistent with, but does not by
itself prove, a successful on-device launch.

### 7.6 Distribution

Neither an Apple developer account nor a Google Play developer account
has been set up (`mobile/README.md`, "Shipping" section) — the app is
not yet submitted to either app store, and no `eas.json` exists in the
repository, meaning no EAS (Expo Application Services) build
configuration has been created either. Current distribution of the
release build is via a GitHub Release
(`https://github.com/slnwriteups/vedanta-yojana/releases/tag/mobile-v1.0.0`),
carrying `app-release.apk` as a downloadable binary asset — chosen over
committing the APK to the repository because both build variants exceed
GitHub's 100 MB per-file limit for a normal git blob, and because build
artifacts are not meant to live in version-controlled history in the
first place.

---

## 8. Engineering decisions

| Decision | Rationale | Alternatives considered | Status |
|---|---|---|---|
| Expo (React Native) for the mobile app, rather than a native Android/iOS codebase | Single codebase for iOS + Android + tablet; reuses the website's content-lib schemas/loader directly; Expo Router mirrors the website's App Router mental model (§5.4) | Not recorded as evaluated — no alternative framework's trial or rejection is established in project history | Active, primary target |
| Content stored as Git-tracked JSON, validated by Zod schemas shared between both runtimes | Single source of truth; no format-specific tooling; schema violations fail loudly with a file path rather than silently rendering wrong data | MDX/Markdown/YAML with frontmatter — explicitly named in `content-lib/README.md` as "not yet here," a distinct future decision if ever adopted | Current, deliberate |
| Metro `watchFolders` + generated static-import manifest, rather than copying content into `mobile/` | Preserves a single source of truth (no duplicated editorial content to keep in sync); the manifest is glue code, not a content copy (§5.3) | Not recorded as evaluated | Active |
| `patch-package` for the autolinking fix, rather than a fork or a version change | Durable across fresh installs; fails loudly if the underlying package changes incompatibly; smallest possible surface area for a two-function fix (§7.3) | Fork-and-publish; manual `node_modules` edit — both explicitly rejected in the reasoning captured in §7.3 | Active |
| `org.gradle.java.home` pinned to JDK 17 in a committed `gradle.properties` | Makes the build reproducible on any machine with that JDK installed, independent of what else is on `PATH`/`JAVA_HOME` (§7.2) | Not recorded as evaluated (e.g., a `.tool-versions`/`jenv`-based approach) | Active |
| GitHub Release (not a repository commit, not Git LFS) for APK distribution | APKs exceed GitHub's 100 MB per-blob limit; build artifacts are regenerable and do not belong in permanent git history | Git LFS — considered when this decision was made in-session; rejected for this project's scale given the added storage-quota and clone-behavior overhead relative to a Release asset | Active |
| Translations stored as a `translations` object on the same content record, not as separate files/collections | Keeps a chapter's English source and its Tamil/Kannada/Hindi translations co-located and validated by one schema; `i18n.ts`'s `localize*()` overlays translations onto the base record non-mutating and field-by-field | Not recorded as evaluated | Active |
| Divya Desam translation quality as the benchmark for all subsequent translated content | It was the first content translated to completion and reviewed to a high bar; used as the calibration reference for tone and fidelity in every book translated afterward (§9) | Not applicable — established by precedent, not by comparison against an alternative benchmark | Active standard |

---

## 9. Content engineering and translation

The translation work is treated in this project as a content-engineering
process with the same rigor as code — with source-of-truth discipline,
mechanical validation, checkpointed commits, and a dedicated review pass
— not as ordinary prose translation.

```
English source (content/*.json body)
        ↓
Translation drafted directly, chapter by chapter (Tamil, Kannada, Hindi)
        ↓
Mechanical validation: paragraph-count parity against the source;
regex check for the gloss-duplication bug (below)
        ↓
Chapter-level QC checklist (13 points, see below)
        ↓
Git checkpoint: commit + push after every 3 completed chapters
        ↓
Full book-level review, after the final chapter
        ↓
Cross-book QC pass, across every translated book/collection
```

### 9.1 Source languages — CONFIRMED (direct project rule, enforced throughout)

Translations are produced in **Tamil, Kannada, and Hindi only.**
**There is no Telugu translation component in this project.** This is
enforced not only as a target-language rule but as a script-purity rule:
Telugu and Kannada share visually similar Unicode ranges for some
independent vowel signs, which is a realistic place for a single
character to leak from one script into the other unnoticed. A
cross-book scan of all 265 translated chapter/entry files (JAYA, Sri
Rama Charithram, Srimad Bhagavata Kathasagaram, the Visishtadvaita book,
and Divya Desams) for any character in the Telugu Unicode block found
exactly one instance — a single Telugu vowel sign (U+0C48) inside an
otherwise-correct Kannada word in `content/divya-desams/tirupperai.json`,
corrected to the equivalent Kannada vowel sign (U+0CC8) in commit
`7f681e5`. No other instance was found anywhere in the corpus.

### 9.2 Shloka and pasuram handling — CONFIRMED (project rule, applied throughout)

Sanskrit shlokas, Upanishad mahavakyas, and Tamil pasurams/riddle-verses
quoted inside a chapter body are never translated line-by-line. Instead:

- The verse is **transliterated** into the target script — native Tamil
  script or Kannada script for those languages; for Hindi, Sanskrit
  verses already given in Devanagari in the English source are left
  as-is (no re-transliteration needed, since Devanagari is already
  Hindi's script).
- Any English prose explaining the verse's *meaning* is translated
  normally.
- No missing verse is invented, and no transliteration is silently
  replaced with an English-language rendering of the Sanskrit content
  itself.

An example spanning both cases in one chapter: chapter 51 of the
Visishtadvaita book ("Conclusion") closes with a Thiruppallandu pasuram
(Tamil, given in the English source in Roman transliteration) and two
Sanskrit dedication shlokas (given in the English source already in
Devanagari) — the pasuram was rendered into native Tamil script, Kannada
script, and Devanagari; the Sanskrit shlokas were script-converted for
Tamil and Kannada and left in their original Devanagari for Hindi.

### 9.3 Source fidelity and the Divya Desams benchmark

Two standing principles govern translation quality:

- **The English source material is the authority for content.** No
  unsupported information is added; the source is never silently
  corrected or rewritten to read better — content-level defects in the
  source itself (see the Lorem Ipsum extraction defect below) are
  corrected only against the *original* source (the source PDF), never
  invented.
- **The existing Divya Desams translations are the quality benchmark**,
  not a content template. The bar they set is: faithful to source,
  natural readable prose (not excessively ornate or "literary"), no
  invented explanations, no dropped content. Later books follow the
  English source's own structure and voice, not the Divya Desam
  records' structure.

### 9.4 Known translation-defect pattern: gloss duplication

A recurring translation-quality risk, checked mechanically after every
chapter: an English source phrase of the form "word (Sanskrit gloss)"
can be mistranslated into a nonsensical self-duplicate — the translated
word followed by the *same translated word* in parentheses, instead of
the translated word followed by the transliterated Sanskrit term. This
is checked via the regex `(\S+)\s*\(\s*\1\s*\)` against every translated
body immediately after drafting. The full 51-chapter Visishtadvaita book
returned zero hits for this pattern across all three target languages.

### 9.5 Known source-content defect: extraction placeholder text

Two chapters in the Visishtadvaita book carried a real content-integrity
defect inherited from the original PDF-to-JSON extraction: an opening
paragraph followed by dozens of literal repeated `"Lorem ipsum dolor sit
amet"` placeholder paragraphs, flagged by the migration pipeline's own
`migration.needsReview` field. This was caught and fixed by reading the
original source PDF (`source-material/Books/A Brief Insight to
Visishtadvaita Philosophy.pdf`) directly via `pdftotext -layout` and
replacing the placeholder text with the real content before translating
— never translating the placeholder text as-is, and never silently
skipping the chapter:

- `guru-parampara.json` (chapter 12) — corrected against source page
  content around the "Guru Parampara" section heading.
- `charama-shlokams.json` (chapter 47) — the real content turned out to
  already be present in the JSON, immediately followed by six junk
  placeholder paragraphs, which were removed.

A prior audit (commit `d741ac3`, 2026-08-16 — before this book had been
reduced to 51 chapters) had already identified this same defect class:
three chapters in the Visishtadvaita book at the time — `charama-shlokams`,
`guru-parampara`, and a third chapter, `srimad-bhagavatham` (order 168,
its own Sanskrit-invocation opening followed by the same placeholder
pattern) — sitting on source pages the original extraction pipeline
itself had already flagged `containsPlaceholderText: true`, a signal the
migration transform had never actually wired into `needsReview` at the
time. `srimad-bhagavatham.json` was later deleted outright, not
corrected, as one of the 4 chapters removed in commit `0ada4a7`
(§5.7) — three days after the audit and before the translation work in
this document began, which is why it is not among the 51 chapters
translated. It should not be confused with *Srimad Bhagavata
Kathasagaram*, the unrelated, separate 31-chapter book added later
(§5.7, §10).

### 9.6 Checkpoint discipline and the 13-point QC checklist

Chapters were translated and committed in batches of 3, with never more
than 3 chapters left uncommitted at once. Before a chapter counts as
"done," it is checked against 13 criteria: translation completeness,
source fidelity, grammar, spelling, punctuation, terminology
consistency, transliteration correctness, shloka/pasuram handling
(§9.2), formatting, natural readability, no content omissions, correct
file location, and valid JSON.

### 9.7 Book-level and cross-book review

After the Visishtadvaita book's final chapter, a dedicated pass checked
all 51 chapters for: remaining placeholder text, stale `needsReview`
metadata flags, duplicated translation passages between chapters, and
recurrence of the gloss-duplication pattern (§9.4). One stale metadata
flag was found (on `guru-parampara`, left set after its content had
already been corrected) and cleared in commit `46deb88`.

A subsequent cross-book pass scanned all 265 chapter/entry files across
every translated book and the Divya Desams for Telugu-script leaks
(§9.1) and for cross-book terminology drift. One substantive finding:
the Tamil word for "moksha" appears in two different legitimate spellings
across the corpus — மோக்ஷம் (a Sanskritized transliteration) and
மோட்சம் (a native Tamil phonetic rendering) — mixed within individual
books rather than cleanly split by book, appearing in JAYA, Srimad
Bhagavata Kathasagaram, Divya Desams, and the Visishtadvaita book alike.
Both are standard, interchangeable usage in Tamil religious writing.
Reviewed directly with the project owner, who elected to leave this as
natural variation rather than force a corpus-wide standardization
touching 150+ occurrences across already-published books.

### 9.8 Translation checkpoint history — CONFIRMED (git log)

The table below covers the Visishtadvaita book, the most recently
completed translation work at the time of writing. Earlier translation
checkpoints for the other three books (Divya Desams, Sri Rama
Charithram, Srimad Bhagavata Kathasagaram, JAYA) are visible in the
broader project timeline in Section 10.

| Chapters | Commit | Notes |
|---|---|---|
| 1–3 | `b0ad186` | |
| 4–6 | `548885e` | |
| 7–9 | `1c09468` | |
| 10–12 | `f070886` | Ch. 12 source-corrected against the original PDF (§9.5) |
| 13–15 | `c3fb841` | |
| 16–18 | `dedb8b8` | |
| 19–21 | `1928efc` | |
| 22–24 | `aa85873` | |
| 25–27 | `cbec458` | |
| 28–30 | `d4ec11a` | |
| 31–33 | `2a20111` | |
| 34–36 | `ddc8b04` | |
| 37–39 | `4724398` | |
| 40–42 | `0cbc5df` | |
| 43–45 | `0de90b1` | |
| 46–48 | `60f01da` | Ch. 47 source-corrected against the original PDF (§9.5) |
| 49–51 | `d7ec1cc` | Book complete |
| — | `46deb88` | Book-level review: stale `needsReview` flag cleared |
| — | `7f681e5` | Cross-book QC: Telugu-character leak fixed (§9.1) |
| — | `d0a0908` | Prior version of this documentation file |

---

## 10. Project timeline

Reconstructed directly from `git log` (154 total commits at the time of
writing). Dates are commit dates as recorded by git, not necessarily the
date work was performed (a squashed or re-based history can shift these
— see the note on early commits below).

| Date | Milestone |
|---|---|
| 2025-07-27 to 2025-07-29 | Earliest repository history (`Fresh repo with updated files`, `Committing changes before rebase`, `Clean push with all current files` ×2) — consistent with initial repository setup / history rewriting, not attributable to a specific feature |
| 2025-10-18, 2025-10-23 | `Clean push: SAP Build export`, `Force refresh: overwrite with new SAP Build export` — the legacy no-code app export (root of `content-extraction/`, §2) enters the repository |
| 2026-08-12 | Mobile app foundation begins: Phase 6A ("establish Expo mobile architecture and content bridge") and Phase 6B ("implement core mobile screens and content rendering") |
| 2026-08-13 | Phase 6C (mobile UX refinement — design system, tabs, dark mode); 108 Divyadesam 2nd-edition source added; Phase 6D (performance, offline architecture, reading experience); Phase 6E (source material, multi-shrine Divya Desam structure); several Divya Desam data-quality fixes (image misattribution, duplicate images, text-corruption audit) |
| 2026-08-14 to 2026-08-16 | Further Divya Desam data-quality fixes; all 107 Divya Desam records published; a Library audit flags source-incomplete chapters (§9.5); the legacy app's original launch screen restored on both platforms |
| 2026-08-17 | Mobile reading-comfort/settings/translation-system pass; full Divya Desam translation into Tamil, Kannada, and Hindi begins and completes across a rapid sequence of small batched commits |
| 2026-08-19 | Three new Library books added: Sri Rama Charithram, Srimad Bhagavata Kathasagaram, JAYA: A Journey of the Mahabharata; mobile content manifest regenerated (§5.3); documentation updated; 4 misplaced chapters removed from the Visishtadvaita book, finalizing it at 51 chapters (§5.7); a paragraph-rendering bug fixed; Sri Rama Charithram translated |
| 2026-08-20 | Srimad Bhagavata Kathasagaram translated; mobile UI/UX redesign and content cleanup; app chrome localized into Tamil/Kannada/Hindi; Sanskrit shlokas in Tamil translations corrected to transliteration instead of Devanagari; JAYA translation begins (69 chapters, translated in a long same-day sequence of per-chapter and small-batch commits) |
| 2026-08-21 | JAYA translation completes; the `expo-modules-autolinking` hang diagnosed and patched (§7.3); the Visishtadvaita book translated in full (51 chapters, checkpointed every 3 — §9.8); book-level and cross-book QC passes; this documentation file first written |
| 2026-08-23 | This document rewritten to its current form; a GitHub Release (`mobile-v1.0.0`) published with the Android release APK attached (§7.6) |

The 2025-07 through 2025-10 commits predate any feature work visible in
this history and are consistent with initial repository/version-control
setup rather than a specific development milestone; this document does
not assign them a more specific purpose than what their own messages
state.

---

## 11. Reproducibility

### 11.1 Prerequisites — CONFIRMED

- Node.js 24 (`.nvmrc` at the repository root; the mobile app's own
  `package.json` does not pin a separate Node version)
- npm (verified against `11.4.2` in the development environment this
  document was written in; not independently pinned by the repository)
- For Android builds: OpenJDK 17 (Homebrew path expected at
  `/opt/homebrew/opt/openjdk@17`, per §7.2 — adjust
  `mobile/android/gradle.properties`'s `org.gradle.java.home` if your
  JDK 17 lives elsewhere or you are not on macOS/Homebrew)
- Android SDK/platform tools for `adb` and device installation
- `gh` (GitHub CLI) only if reproducing the release-publishing step

### 11.2 Website

```
npm install
npm run dev              # http://localhost:3000
npm run test:content     # content-lib + schema tests
npm run test:app         # app-layer tests
npm run typecheck
npm run build             # production build
```

### 11.3 Mobile — development

```
cd mobile
npm install               # runs patch-package automatically via postinstall (§7.3)
npx expo start             # Expo dev server (Metro) — scan the QR code with Expo Go
npx expo start --android   # requires Android tooling
npx expo start --ios       # requires Xcode/iOS tooling
npx expo start --tunnel    # share a live QR code with a remote reviewer
node --test tests/*.test.ts               # test suite (Node-native, no Jest)
./node_modules/.bin/tsc --noEmit          # TypeScript check
node scripts/generate-content-manifest.ts  # regenerate content + image manifest after any /content or public/images change — see §5.3 for why this is easy to forget
```

### 11.4 Android — debug build

```
cd mobile/android
./gradlew assembleDebug
# output: mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### 11.5 Android — release build

```
cd mobile/android
./gradlew assembleRelease
# output: mobile/android/app/build/outputs/apk/release/app-release.apk
```

No separate manual bundling step is needed: `mobile/android/app/build.gradle`
sets `bundleCommand = "export:embed"`, so the React Native Gradle
plugin's `createBundleReleaseJsAndAssets` task invokes
`npx expo export:embed` automatically as part of `assembleRelease` —
this is the exact command whose Metro/resolver fix is documented in
§7.4. Running `npx expo export:embed` by hand first is only useful for
isolating a bundling failure from a native/Gradle failure while
debugging.

### 11.6 Installing on a physical device

```
adb devices                  # confirm the device is visible and authorized
adb install path/to/app-debug.apk      # or app-release.apk
```

### 11.7 Known troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Unsupported class file major version 68` during a Gradle build | Gradle 8.13 resolved an unsupported JDK (e.g. `openjdk@24`) | Confirm `org.gradle.java.home` in `mobile/android/gradle.properties` points at a real JDK 17 install on your machine (§7.2) |
| Android build (or `react-native-config`/`resolve` autolinking commands) hangs indefinitely with no output | The unpatched `expo-modules-autolinking@2.1.15` `glob.stream()` hang (§7.3) | Run `npm install` inside `mobile/` so `postinstall` applies `mobile/patches/expo-modules-autolinking+2.1.15.patch`; if it was skipped (e.g. `--ignore-scripts`), run `npx patch-package` manually |
| `npx expo export` fails with `Unable to resolve module zod from .../content-lib/schemas/shared.ts` | Metro's resolver did not include the repository root's `node_modules` (§7.4) | Confirm `mobile/metro.config.js`'s `config.resolver.nodeModulesPaths` still includes the repo root |
| New/edited content under `/content` doesn't appear in the mobile app, but does on the website | The mobile content manifest is a build-time snapshot, not live (§5.3) | Run `node mobile/scripts/generate-content-manifest.ts` |
| `tsc --noEmit` in `mobile/` takes minutes | `resolveJsonModule` re-enabled, causing full literal-type inference over 160+ JSON content imports (§5.3) | Confirm `mobile/tsconfig.json` still sets `"resolveJsonModule": false` |

### 11.8 The dependency patch, explained for maintainers

`mobile/patches/expo-modules-autolinking+2.1.15.patch` exists because of
a confirmed, reproducible hang in that exact package version under this
project's dependency tree (§7.3). It is applied automatically by
`patch-package` via the `"postinstall": "patch-package"` script in
`mobile/package.json` on every `npm install` — no manual step is
required in the ordinary case. If `expo-modules-autolinking` is ever
upgraded past `2.1.15`, `patch-package` will fail loudly (rather than
silently applying a stale patch) if the target file no longer matches
what the patch expects; at that point, re-verify whether the upstream
`glob.stream()` code path has changed or been fixed before deciding
whether the patch is still needed.

---

## 12. Current state and known limitations

- The website (repository root) is legacy/maintenance-only; new feature
  work targets the mobile app (`mobile/README.md`, confirmed by the
  project's own stated direction).
- Translations (`content-lib/i18n.ts`) are wired into the mobile UI only;
  the data exists in `/content` for the website too, but no website UI
  currently calls the localization functions.
- The mobile app is not yet submitted to either app store; no `eas.json`
  exists; distribution is currently via a GitHub Release
  (`mobile-v1.0.0`) or direct Expo Go / EAS internal-distribution sharing
  (§7.6).
- For genuine offline-first image handling at scale (230+ images),
  `mobile/README.md` identifies `expo-file-system` with on-first-use
  caching as the natural next step, not yet implemented — images are
  currently bundled directly into the app binary via Metro's asset
  pipeline.
- `content-lib/README.md` and `content/README.md` contain stale content
  counts (55/162 chapters, from before the 4-chapter Visishtadvaita
  correction and the addition of three more Library books) that were not
  updated as part of this documentation pass; §5.7 above gives the
  current, directly recounted figures. Updating those two files is
  flagged here as outstanding maintenance work, not performed as part of
  this rewrite (out of scope: this pass covers `DOCUMENTATION.md` only).
- The Tamil மோக்ஷம்/மோட்சம் spelling variation (§9.7) is a deliberate,
  reviewed decision to leave as-is, not an unnoticed inconsistency.

---

## 13. Editorial self-review

Performed as a separate pass after drafting, checking this document
against the standard it was written to meet:

**Technical accuracy.** Every version number, file path, commit hash,
and command in this document was read directly from the repository or
its installed dependencies at the time of writing (§3, §4, §7) rather
than assumed. Commands in §11 match the scripts actually defined in
`package.json`/`mobile/package.json` and the `mobile/README.md`
commands already in use in this project.

**Historical accuracy.** The project timeline (§10) is built entirely
from `git log` output, not narrative reconstruction. Every commit hash
cited elsewhere in this document was independently confirmed to exist
and to say what this document claims it says (`git show <hash>`), not
copied from a prior draft without re-verification. No date, decision, or
motivation is stated more specifically than the evidence supports — see
the four-tier evidentiary framework in the Scope section and its
application throughout §7 in particular.

**Completeness.** Development process (§6, §10), the AI-assisted
workflow specifically (§6), architecture (§4, §5), the translation
process (§9), the error/fix history (§7), git history (§9.8, §10), build
and reproduction instructions (§11), and current limitations (§12) are
each covered as their own section.

**Professional quality.** Written in the register of engineering
documentation — structured sections, tables, precise terminology,
citations to specific files/commits/line-level diffs — without
conversational filler, marketing language, or reader-directed
reassurance ("this is easy," "don't worry").

**Reproducibility.** §11 gives a developer with no prior context enough
to install, run, build, and troubleshoot both runtimes, cross-referenced
back to the architecture/troubleshooting sections that explain *why*
each step is necessary.

Two things this review deliberately did **not** do, and why: it did not
independently verify every command in §11 by executing it fresh in this
session (several — `expo start`, a full `assembleRelease` — are
long-running and were already exercised to produce the existing APK
artifacts referenced in §7.5), and it did not update the stale counts in
`content-lib/README.md`/`content/README.md` noted in §12, since that is
a change to different files outside this rewrite's stated scope.
