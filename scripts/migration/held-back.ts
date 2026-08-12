import type { SourceContentBlock, SourceExternalLink, SourceGenericRecord } from "./types.ts";

/**
 * Represents a source record whose destination content TYPE has not been
 * decided — modeling the real Page150 ("Hayagriva Stotram") situation
 * from Phase 5A: it has `classification.category ===
 * "unresolved_possible_divya_desam"`, but unlike Page93 (which is
 * structurally temple-shaped), its content doesn't clearly belong to
 * DivyaDesam, Book/Chapter, or Knowledge. This phase does not decide
 * that; it only proves the source content can be safely PRESERVED
 * without being forced into any of the three destination schemas.
 *
 * `HeldBackRecord` is deliberately NOT one of the Phase 5C destination
 * types and is never passed through DivyaDesamSchema, BookSchema,
 * ChapterSchema, or KnowledgeSchema. It exists purely so the migration
 * layer has somewhere safe to put a record it cannot yet classify,
 * instead of being forced to guess.
 */
export interface HeldBackRecord {
  sourcePageId: string;
  title: string;
  extractionConfidence: "high" | "medium" | "low";
  needsReview: true;
  /** Preserved verbatim and untransformed -- no field extraction/parsing is attempted while a record is held back. */
  rawContentBlocks: SourceContentBlock[];
  /**
   * Preserved verbatim and untransformed. Added during Phase 5H: the
   * real Page150 record's 4 PDF resource links live in the source's
   * `externalLinks` array, not in `contentBlocks` — without this field,
   * holding it back would have silently lost those links, which Phase
   * 5H explicitly requires not to happen.
   */
  rawExternalLinks: SourceExternalLink[];
}

export function holdBackUnresolvedRecord(source: SourceGenericRecord): HeldBackRecord {
  return {
    sourcePageId: source.pageId,
    title: source.title,
    extractionConfidence: source.classification.confidence,
    needsReview: true,
    rawContentBlocks: source.contentBlocks,
    rawExternalLinks: source.externalLinks,
  };
}
