import { z } from "zod";
import {
  ImageEntrySchema,
  MigrationMetadataSchema,
  SlugSchema,
  StatusSchema,
  translationsSchemaFor,
} from "./shared.ts";

/** See content-lib/schemas/divya-desam.ts's own translations block for the full "why". */
export const ChapterTranslationSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});
export type ChapterTranslation = z.infer<typeof ChapterTranslationSchema>;

export const ChapterTranslationsSchema = translationsSchemaFor(ChapterTranslationSchema);

/**
 * Book Chapter schema — Phase 5C.
 *
 * NOTE ON `order`: this schema validates only that `order` is an integer
 * on an individual chapter record. It CANNOT and does not enforce that
 * `order` values are unique across all chapters of a given book — that is
 * a cross-record concern belonging to the post-migration validation stage
 * (Phase 5I), once real chapter files exist to check against each other.
 *
 * Previous/next chapter navigation is derived from `order` at render
 * time by the (not-yet-built) application layer — never hand-authored
 * per chapter, and not something this schema is responsible for.
 */
export const ChapterSchema = z.object({
  title: z.string().min(1),
  slug: SlugSchema,
  order: z.number().int(),
  status: StatusSchema,
  migration: MigrationMetadataSchema,
  /** Long-form body text. Required and non-empty for an actual chapter. */
  body: z.string().min(1),
  images: z.array(ImageEntrySchema).default([]),
  translations: ChapterTranslationsSchema.optional(),
});
export type Chapter = z.infer<typeof ChapterSchema>;
