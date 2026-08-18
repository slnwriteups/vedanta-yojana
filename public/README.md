# /public

Standard Next.js static-assets directory.

**Status: populated.** `images/` holds the 230 real Divya Desam/Library
images referenced by `content/` records via `sourceAssetUuid` (up from the
original 217 as Phase 6E's book imports added a few more). Served directly
by Next.js at request time on the website; the mobile app reaches the same
files through `mobile/metro.config.js`'s `watchFolders` plus
`mobile/content-lib/image-manifest.generated.ts` (see `mobile/README.md`) —
neither copies or duplicates the files, both read this directory as the
single source of truth.
