/**
 * Content schema barrel — Phase 5C.
 *
 * This module exports the schema contract that all later migrated content
 * must satisfy. It does NOT read `/content`, does NOT know how to load
 * files, and does NOT depend on `content-extraction/` in any way. The
 * typed loader that actually reads `/content` and validates it against
 * these schemas is Phase 5D, not implemented here.
 */

export * from "./shared.ts";
export * from "./divya-desam.ts";
export * from "./book.ts";
export * from "./chapter.ts";
export * from "./knowledge.ts";
