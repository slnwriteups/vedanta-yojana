/**
 * Migration transformation layer — Phase 5E.
 *
 *   content-extraction/ (a future phase's filesystem orchestration, NOT built yet)
 *           ↓
 *   these pure transformation functions
 *           ↓
 *   Zod validation (content-lib/schemas — already applied internally by each transform* function)
 *           ↓
 *   a validated destination object (DivyaDesam / Book / Chapter / Knowledge)
 *
 * Every function here is PURE: given the same input, it always produces
 * the same output, and it never touches the filesystem, the network, or
 * any global/shared mutable state. None of it reads content-extraction/
 * — that orchestration (reading real files, walking content-extraction/,
 * writing to /content) is explicitly a later phase's responsibility, not
 * this one's.
 */

export * from "./errors.ts";
export * from "./types.ts";
export * from "./slug.ts";
export * from "./text-parser.ts";
export * from "./images.ts";
export * from "./links.ts";
export * from "./divya-desam.ts";
export * from "./book.ts";
export * from "./knowledge.ts";
export * from "./held-back.ts";
