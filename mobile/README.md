# Vedanta Yojana — Mobile (Phase 6A Foundation)

This is the **foundation** for a React Native + Expo mobile application.
It is not a working app yet — no real screens exist. Its only job is to
prove that Expo boots, and that the validated `/content` baseline can be
consumed from a React Native runtime without duplicating a single byte
of editorial content.

The existing Next.js application at the repository root is the
**validated reference implementation**. It is not being deleted, and it
is not the thing this app will eventually become — this app is a
separate runtime, built from the same content.

## Why Expo Router (not plain React Navigation)

Expo Router is used for the navigation foundation
(`mobile/app/_layout.tsx`). Two things drove the choice:

1. **It mirrors the mental model already established by the web
   reference app.** The Next.js app uses the App Router: an `app/`
   directory, file-based routes, a root layout. Expo Router uses the
   identical convention for React Native. Someone who already
   understands `vedanta-yojana/app/divya-desams/[slug]/page.tsx` already
   understands what `vedanta-yojana/mobile/app/divya-desams/[slug].tsx`
   would look like, with no new routing model to learn.
2. **It is not actually a competitor to React Navigation** — Expo
   Router is a file-based routing convention built on top of React
   Navigation internally (this project's `mobile/package.json` has
   `react-native-screens`/`react-native-safe-area-context` installed as
   Expo Router's own peer dependencies, for exactly that reason). Choosing
   Expo Router gets React Navigation's actual navigator/gesture/screen
   primitives "for free," authored with the file-based convention
   instead of hand-built navigator trees.

No other navigation library was evaluated as a real alternative given
those two points.

## Content access strategy (Step 3 / Step 4)

**The single source of truth remains `/content` at the repository
root.** Nothing under `/content` is copied, mirrored, or duplicated into
`mobile/`.

The problem this had to solve: the web app's loader
(`content-lib/loader/index.ts`) reads `/content` from disk at request
time via `node:fs`. Metro (React Native's bundler) has no equivalent —
it needs statically analyzable `import` statements at bundle time, and a
React Native app has no filesystem to lazily read from at runtime the
way a Node server does.

The bridge, in three pieces:

1. **`mobile/metro.config.js`** — adds `content/` and `content-lib/` (at
   the repo root) to Metro's `watchFolders`, so Metro is even allowed to
   see files outside `mobile/`. It also extends
   `resolver.nodeModulesPaths` to include the repo root's
   `node_modules`, because `content-lib/schemas` imports `zod`, and
   `content-lib/` is a sibling of `mobile/`, not an ancestor — normal
   upward node_modules resolution from a file inside `content-lib/`
   never reaches `mobile/node_modules` on its own. (`zod` is also
   installed directly in `mobile/package.json`, so this isn't a hidden
   runtime-only dependency on the web app's tree — it's belt-and-braces,
   verified necessary by running an actual bundle export and reading the
   exact resolution error Metro produced.)
2. **`mobile/scripts/generate-content-manifest.ts`** (Option C from the
   Phase 6A brief — a build-time content export step) — a small Node
   script that enumerates the real `/content` tree once and emits
   `mobile/content-lib/manifest.generated.ts`: nothing but `import`
   statements pointing directly at the real files, plus arrays that
   reference those imported bindings. **No content is copied into the
   generated file** — it is glue code, like a lockfile. Regenerate it
   after any content change:
   ```
   node mobile/scripts/generate-content-manifest.ts
   ```
3. **`mobile/content-lib/loader.ts`** — the mobile-compatible content
   access layer, with the exact same public API as the web loader:
   `loadDivyaDesams`, `loadDivyaDesam`, `loadBooks`, `loadBook`,
   `loadChapters`, `loadChapter`, `loadKnowledge`, `loadKnowledgeRecord`.
   It validates every record through the **same Zod schemas** as the web
   app (`content-lib/schemas/index.ts`, imported directly — not
   reimplemented), and reuses the same error classes
   (`content-lib/loader/errors.ts`: `ContentValidationError`,
   `DuplicateSlugError`, `DuplicateChapterOrderError`). Not-found
   semantics match the web loader exactly (`null` for a single lookup,
   `[]` for an empty collection).

   **One deliberate, disclosed difference from the web loader:** this
   module caches its parsed/validated results after the first call. The
   web loader explicitly does not cache, because a dev server's
   `/content` can change underneath it between requests. The mobile
   manifest is compiled into the app binary at build time and cannot
   change at runtime, so re-validating 160+ records through Zod on every
   call would only cost battery for no benefit. This is a correct
   adaptation to a different runtime model, not a shortcut.

### A real, worth-knowing gotcha: JSON import attributes

Every generated import looks like:

```ts
import dd_sriRangam from "../../content/divya-desams/sri-rangam.json" with { type: "json" };
```

The `with { type: "json" }` is required by **Node's** native ESM loader
(used by `node --test` for `mobile/tests/`) — without it, Node fails
immediately with `ERR_IMPORT_ATTRIBUTE_MISSING`. Metro does not require
this attribute for its own JSON handling, but it parses and ignores it
without error, so the one generated line works correctly under both
runtimes. This was verified empirically (not assumed) by running both
`node --test mobile/tests/loader.test.ts` and `npx expo export` against
the exact same generated file.

### A real TypeScript performance gotcha

`mobile/tsconfig.json` explicitly sets `"resolveJsonModule": false`,
overriding `expo/tsconfig.base`'s default of `true`, with an ambient
`declare module "*.json"` fallback in `content-lib/json-module.d.ts`.
With `resolveJsonModule` on, `tsc` infers a full precise literal type
from every imported JSON file's actual content — for 160+ imports, some
containing long prose (chapter bodies, Sthala Puranam text), this made
`tsc --noEmit` take minutes. Turning it off and typing every JSON import
`unknown` (immediately validated by the real Zod schema right after
import in `loader.ts` anyway) fixed it: `tsc --noEmit` now runs in about
a second. This does **not** affect Metro/Babel's actual JSON bundling at
runtime — that is a completely separate mechanism from `tsc`'s static
type-checking.

## Asset (image) strategy — Step 5, design only, not implemented

**No images were migrated in this phase.** The Phase 6A foundation tests
don't need any (they only verify record resolution), and copying/
re-encoding is explicitly out of scope for a foundation phase.

The documented plan, for whenever Phase 6B+ actually needs images:

- The migrated `sourceAssetUuid`/`sourceOriginalName` identity on every
  `ImageEntry` (`content-lib/schemas/shared.ts`) is preserved and reused
  exactly as-is — no renaming, no re-encoding, ever.
- The real image files currently live at `/public/images/` at the repo
  root (moved there from `/images/` by unrelated, already-in-progress
  work on the web app's own deployment target — not something this phase
  touched or should touch).
- The natural extension of the pattern already built for content is the
  same shape for images: add `images/` to `metro.config.js`'s
  `watchFolders`, and extend `generate-content-manifest.ts` to also emit
  a `sourceAssetUuid -> require(...)` map, so Metro's own asset pipeline
  (which already knows how to hash, cache-bust, and bundle
  `require()`'d image files) handles the actual bytes — no custom image
  route handler is needed the way the (now-removed, Vercel-specific)
  `app/images/[uuid]/route.ts` needed one, because a bundled RN app has
  no server to route a request to in the first place.
- For genuine offline-first behavior at scale (217 images, ~17MB) rather
  than bundling everything into the app binary, `expo-file-system` +
  on-first-use caching is the natural next step, but that is a real
  product decision (bundle-everything vs. download-on-demand) deferred
  to whoever actually builds the image-bearing screens.

## Development commands

```
cd mobile
npm start              # Expo dev server (Metro)
npm run android         # (requires Android tooling)
npm run ios              # (requires Xcode/iOS tooling)
node --test tests/*.test.ts    # foundation tests (Node-native, no Jest)
./node_modules/.bin/tsc --noEmit    # TypeScript check
node scripts/generate-content-manifest.ts   # regenerate the content manifest after any /content change
```

## Relationship to the web reference app

| | Web (repo root) | Mobile (`mobile/`) |
|---|---|---|
| Framework | Next.js (App Router) | Expo + Expo Router |
| Content access | `content-lib/loader` (Node `fs`, request-time) | `mobile/content-lib/loader.ts` (Metro-bundled, build-time) |
| Schemas | `content-lib/schemas` | **the same files**, imported directly |
| Search | `content-lib/search` (browser-side prebuilt index) | not yet bridged |
| SEO/sitemap/robots | yes | not applicable |
| Status | validated reference implementation | foundation only |

Nothing in `content-lib/schemas/`, `content-lib/loader/`,
`scripts/migration/`, `content-extraction/`, or `/content` was modified
to build this foundation.

## What this phase deliberately does NOT include

Per the Phase 6A brief: no Home screen, no Divya Desam screens, no
Library screens, no Search UI, no real theme system, no App Store
preparation. `mobile/app/index.tsx` is a placeholder that proves the
foundation works — it is not a home screen.
