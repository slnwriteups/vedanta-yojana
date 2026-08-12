# /tests/content

Unit tests for the Phase 5C content schemas (`/content-lib/schemas`).

Run with:

```
npm run test:content
```

(equivalent to `node --test tests/content` — Node's built-in test runner,
using its native TypeScript execution. No test framework dependency was
added; only `zod` was installed for this phase.)

**Note on imports**: these test files use relative imports with explicit
`.ts` extensions (e.g. `"../../content-lib/schemas/index.ts"`), unlike
`/app` and `/components`, which use the `@/...` alias. Node's native
module resolution does not read `tsconfig.json`'s `paths` mapping the way
Next.js's bundler does, so the alias only works inside the Next.js build.

`fixtures/` contains hand-written **synthetic** fixture objects only
("Example Temple", `https://example.com/...`, etc.) — no content copied
from `content-extraction/`.

Still not present in this phase (belong to later phases, once real
migrated content exists to check): the 108-record count test, bidirectional
`sourcePageId` traceability, image-asset-registry existence checks,
cross-record chapter-order-uniqueness, and any Page93/Page150-specific
assertions.
