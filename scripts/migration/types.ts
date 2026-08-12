/**
 * TypeScript representations of the shapes the migration transformation
 * layer consumes — modeled on the real content-extraction/ output shapes
 * (Phase 3) closely enough to exercise realistic structure, but these are
 * NOT the same types as content-extraction's own generated data, and this
 * module never imports from content-extraction/ in any way.
 *
 * These are deliberately NOT the Phase 5C destination (Zod) schemas —
 * per the required source/destination boundary, destination validation
 * always goes through content-lib/schemas, never through these types.
 */

export type SourceExtractionConfidence = "high" | "medium" | "low";

export interface SourceClassification {
  /** Known real values include "divya_desam_candidate", "unresolved_possible_divya_desam", "non_temple_content_candidate" — kept as a plain string here since the migration layer only branches on the "unresolved_possible_divya_desam" case explicitly. */
  category: string;
  confidence: SourceExtractionConfidence;
}

export type SourceContentBlockType = "text" | "button" | "picture" | "icon" | "layout" | "view";

export interface SourceContentBlock {
  type: SourceContentBlockType;
  /** Present on "text" blocks. */
  content?: string;
  /** Present on "button" blocks — presentation metadata, never migrated as content (see scripts/migration/divya-desam.ts). */
  label?: string;
  /** Present on "picture" blocks, "ag-asset://<uuid>" form, matching the real extraction shape. */
  imageAssetRef?: string;
}

export type SourceResourceType = "google_maps_location" | "sloka_pdf_prapatti";

export interface SourceExternalLink {
  url: string;
  resourceType: SourceResourceType;
  sourceComponentLabel: string | null;
  /**
   * Optional page association, mirroring the real
   * resources/external-links.json's per-link `pageId` field. When
   * present, the transformer verifies it matches the record being
   * transformed and refuses to silently attach a mismatched link.
   */
  pageId?: string;
}

export interface SourceDivyaDesamRecord {
  pageId: string;
  title: string;
  classification: SourceClassification;
  imageAssetRefs: string[];
  externalLinks: SourceExternalLink[];
  contentBlocks: SourceContentBlock[];
}

export interface SourceBookRecord {
  pageId: string;
  title: string;
  classification: SourceClassification;
}

export interface SourceChapterRecord {
  pageId: string;
  title: string;
  order: number;
  classification: SourceClassification;
  contentBlocks: SourceContentBlock[];
  imageAssetRefs: string[];
}

export interface SourceKnowledgeRecord {
  pageId: string;
  title: string;
  contentType: string;
  classification: SourceClassification;
  contentBlocks: SourceContentBlock[];
  imageAssetRefs: string[];
}

/**
 * A generic record shape for the held-back/unresolved case (e.g. Page150).
 *
 * Includes `externalLinks`: discovered during Phase 5H that Page150's own
 * PDF resource links live in the source's separate `externalLinks` array,
 * not in `contentBlocks` — a record held back using only
 * pageId/title/classification/contentBlocks would silently lose those
 * links. This field was added specifically so `holdBackUnresolvedRecord`
 * can preserve them, per Phase 5H's explicit requirement that held-back
 * content not lose its external resource references. `SourceDivyaDesamRecord`
 * already structurally satisfies this shape (it's a superset), so the
 * existing extraction adapter can be reused as-is for a held-back record too.
 */
export interface SourceGenericRecord {
  pageId: string;
  title: string;
  classification: SourceClassification;
  contentBlocks: SourceContentBlock[];
  externalLinks: SourceExternalLink[];
}

export interface SourceImageRegistryEntry {
  assetUuid: string;
  sourceOriginalName: string;
  /** Representable without affecting identity/resolution — never causes a rename or re-encode. */
  extensionMismatch?: boolean;
}

export type SourceImageRegistry = Map<string, SourceImageRegistryEntry>;

export interface MigrationContext {
  imageRegistry: SourceImageRegistry;
}
