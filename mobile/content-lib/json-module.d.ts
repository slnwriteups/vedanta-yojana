/**
 * Ambient fallback for `import x from "*.json"` now that
 * mobile/tsconfig.json turns off `resolveJsonModule` (see that file's
 * comment for why). Every JSON import is validated through the real Zod
 * schemas immediately after import in content-lib/loader.ts anyway, so
 * typing them `unknown` here costs nothing -- it just moves the
 * type-safety checkpoint from "trust tsc's inferred literal type" to
 * "trust the Zod schema", which is what actually happens either way.
 */
declare module "*.json" {
  const value: unknown;
  export default value;
}
