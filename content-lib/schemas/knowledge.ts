import { z } from "zod";
import {
  ImageEntrySchema,
  MigrationMetadataSchema,
  RelatedContentRefSchema,
  SlugSchema,
  StatusSchema,
  translationsSchemaFor,
} from "./shared.ts";

/** See content-lib/schemas/divya-desam.ts's own translations block for the full "why". */
export const KnowledgeTranslationSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});
export type KnowledgeTranslation = z.infer<typeof KnowledgeTranslationSchema>;

export const KnowledgeTranslationsSchema = translationsSchemaFor(KnowledgeTranslationSchema);

/**
 * Knowledge schema — Phase 5C.
 *
 * Generic content model for non-temple, non-book-chapter material
 * (philosophy, biography, itihasa, purana, stotram, educational, article,
 * etc. — per Phase 4A/4B, "article" is not assumed to be the universal
 * type). `contentType` is deliberately an open string, not a closed enum,
 * so a new category never requires a schema change — only a documented
 * convention.
 *
 * Known/expected values as of Phase 5A (not enforced, for reference only):
 * "educational" | "philosophy" | "biography" | "itihasa" | "purana" |
 * "stotram" | "article"
 *
 * No Knowledge record (including the eventual Page4 "Introduction") is
 * created in this phase.
 */
export const ContentTypeSchema = z.string().min(1);
export type KnowledgeContentType = z.infer<typeof ContentTypeSchema>;

export const KnowledgeSchema = z.object({
  title: z.string().min(1),
  slug: SlugSchema,
  contentType: ContentTypeSchema,
  status: StatusSchema,
  migration: MigrationMetadataSchema,
  body: z.string().min(1),
  images: z.array(ImageEntrySchema).default([]),
  relatedContent: z.array(RelatedContentRefSchema).default([]),
  translations: KnowledgeTranslationsSchema.optional(),
});
export type Knowledge = z.infer<typeof KnowledgeSchema>;
