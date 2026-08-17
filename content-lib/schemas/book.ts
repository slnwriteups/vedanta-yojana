import { z } from "zod";
import {
  ImageEntrySchema,
  MigrationMetadataSchema,
  SlugSchema,
  StatusSchema,
  translationsSchemaFor,
} from "./shared.ts";

/**
 * See content-lib/schemas/divya-desam.ts's own translations block for
 * the full "why". `author` is deliberately excluded -- a person's name,
 * not prose to translate.
 */
export const BookTranslationSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});
export type BookTranslation = z.infer<typeof BookTranslationSchema>;

export const BookTranslationsSchema = translationsSchemaFor(BookTranslationSchema);

/**
 * Book + Chapter schemas — Phase 5C.
 *
 * The recovered book candidate (Phase 4A/5A) has no confirmed title,
 * author, or chapter-numbering scheme yet — that is an open editorial
 * decision. This schema must therefore allow a Book to exist entirely as
 * `status: "draft"` with `author`/`description`/`coverImage` all absent.
 * No real book.json is created in this phase.
 */

/**
 * An optional top-level grouping of chapters. The recovered book has no
 * part/section structure at all (a flat chapter list), so `parts` is
 * expected to be empty for the foreseeable first migration — but the
 * shape exists because Phase 4B's book model explicitly allows some
 * future book to use parts.
 */
export const BookPartSchema = z.object({
  title: z.string().min(1),
  order: z.number().int(),
});
export type BookPart = z.infer<typeof BookPartSchema>;

export const BookSchema = z.object({
  slug: SlugSchema,
  title: z.string().min(1),
  author: z.string().min(1).nullable().optional(),
  description: z.string().min(1).nullable().optional(),
  /** Reuses the shared image model rather than a bespoke "just a URL" field. */
  coverImage: ImageEntrySchema.nullable().optional(),
  status: StatusSchema,
  migration: MigrationMetadataSchema,
  parts: z.array(BookPartSchema).default([]),
  /** Ordered list of chapter slugs. Chapter records themselves live separately. */
  chapterOrder: z.array(SlugSchema).default([]),
  translations: BookTranslationsSchema.optional(),
});
export type Book = z.infer<typeof BookSchema>;
