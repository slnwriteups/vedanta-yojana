import { z } from "zod";

/**
 * Shared building blocks used across every content type (Divya Desam,
 * Book, Chapter, Knowledge). Kept deliberately small — only what multiple
 * content types actually need in common. Do not add fields here "for
 * later"; extend individual content schemas instead if something turns
 * out to be type-specific.
 */

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/**
 * Publication status. STRUCTURAL SAFETY RULE (Phase 5A, corrected):
 * every content schema's `status` field must use `StatusSchema` as defined
 * here so that omitting `status` always produces `"draft"`, never
 * `"published"`. No content schema may override this default.
 */
export const ContentStatusSchema = z.enum(["draft", "published"]);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

export const StatusSchema = ContentStatusSchema.default("draft");

// ---------------------------------------------------------------------------
// Migration metadata
// ---------------------------------------------------------------------------

/**
 * Technical extraction confidence from the Phase 3 pipeline. This is a
 * signal about how confident the AUTOMATED CLASSIFICATION was — it is
 * metadata about the extraction process, not editorial judgment, and it
 * must never be used to derive or influence `status`.
 *
 * Three values, not two: Phase 3's Divya Desam classification
 * (`content-extraction/divya-desams/`) only ever produces "high" or
 * "low". Its separate non-temple classification
 * (`content-extraction/articles/`) independently produces "medium" for
 * every one of its 56 records. Both are real, observed values in the
 * frozen extraction snapshot — discovered during Phase 5H when migrating
 * the 55 book chapters + 1 Knowledge record for the first time. "medium"
 * was added here rather than coerced to "high"/"low" at migration time,
 * which would have fabricated metadata that doesn't reflect the source.
 */
export const ExtractionConfidenceSchema = z.enum(["high", "medium", "low"]);
export type ExtractionConfidence = z.infer<typeof ExtractionConfidenceSchema>;

/**
 * Reusable migration/provenance metadata. Every migrated record carries
 * this so it remains traceable back to its exact source page in
 * `content-extraction/`, per the Phase 5A migration-safety requirements.
 *
 * Deliberately minimal: this is NOT a reproduction of the full source
 * classification object (evidence, method, componentCounts, etc.) — only
 * the three fields needed for traceability and review-gating are kept.
 */
export const MigrationMetadataSchema = z.object({
  sourcePageId: z.string().min(1),
  extractionConfidence: ExtractionConfidenceSchema,
  needsReview: z.boolean(),
});
export type MigrationMetadata = z.infer<typeof MigrationMetadataSchema>;

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

/**
 * Lowercase kebab-case only: one or more alphanumeric segments separated
 * by single hyphens. No leading/trailing hyphens, no doubled hyphens, no
 * uppercase, no underscores/spaces.
 *
 * Passes: "sri-rangam", "tirukkozhi-urayur", "tirudwarkai-dwarka",
 *         "tiruparkadal-ksheerabdi"
 * Fails:  "Sri Rangam", "sri_rangam", "sri--rangam", "-sri-rangam",
 *         "sri-rangam-"
 *
 * This validates SHAPE only. Slug *generation* from recovered titles is
 * Phase 5E/5F migration logic, not part of this schema.
 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const SlugSchema = z
  .string()
  .min(1)
  .regex(SLUG_PATTERN, "Slug must be lowercase kebab-case (e.g. \"sri-rangam\")");

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/**
 * Accessibility/provenance status for an image's alt text, distinguishing
 * "nobody has reviewed this yet" from an actual editorial decision that
 * the image needs no alt text. Defaults to "needs-review" because no
 * migrated image has real alt text to inherit from the source — alt text
 * must never be fabricated.
 */
export const ImageAltStatusSchema = z.enum([
  "needs-review",
  "confirmed-meaningful",
  "confirmed-decorative",
]);
export type ImageAltStatus = z.infer<typeof ImageAltStatusSchema>;

/**
 * A single image reference, attachable to any content type. The same
 * asset (same assetId/sourceAssetUuid) may legitimately appear on more
 * than one content record — Phase 5A confirmed 4 such shared-asset cases
 * in the source data. This schema does not and must not enforce
 * one-record-per-asset; that would contradict the actual source data.
 */
export const ImageEntrySchema = z.object({
  /** New, stable identifier assigned during migration (not ag-asset://). */
  assetId: z.string().min(1),
  /** The original extracted UUID, preserved for traceability only. */
  sourceAssetUuid: z.string().min(1),
  /** The original pre-export filename (e.g. "Jaya.jpg"), preserved for provenance. */
  sourceOriginalName: z.string().min(1),
  /** Alt text. Never fabricated — null until a human supplies real text. */
  alt: z.string().nullable(),
  altStatus: ImageAltStatusSchema.default("needs-review"),
});
export type ImageEntry = z.infer<typeof ImageEntrySchema>;

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

/**
 * The set of content types a relationship may point at. This mirrors the
 * content types actually implemented in this phase — it is not a general
 * "SAP navigation edge" model and is not related to the old app's
 * internalNavigationOutEdges structure.
 */
export const RelatedContentTypeSchema = z.enum([
  "divya-desam",
  "book",
  "chapter",
  "knowledge",
]);
export type RelatedContentType = z.infer<typeof RelatedContentTypeSchema>;

/**
 * Minimal relationship reference: identifies WHAT is related (type + slug)
 * only. This schema validates shape only. Whether the referenced slug
 * actually exists is a cross-record concern for the post-migration
 * validation stage (Phase 5I), not this schema.
 */
export const RelatedContentRefSchema = z.object({
  type: RelatedContentTypeSchema,
  slug: SlugSchema,
});
export type RelatedContentRef = z.infer<typeof RelatedContentRefSchema>;
