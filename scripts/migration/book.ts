import { BookSchema, ChapterSchema, type Book, type Chapter } from "../../content-lib/schemas/index.ts";
import { resolveImageAssets } from "./images.ts";
import { generateSlugFromTitle } from "./slug.ts";
import type { MigrationContext, SourceBookRecord, SourceChapterRecord } from "./types.ts";

/**
 * Transforms a synthetic/real source book record into a validated Book.
 *
 * Deliberately minimal: no author, description, or coverImage is ever
 * invented. If the source doesn't supply one (it never does yet — the
 * real recovered book's identity is an open editorial decision per
 * Phase 5A), those fields are simply absent, and BookSchema's own
 * optionality handles that correctly.
 */
export function transformBook(source: SourceBookRecord): Book {
  const slug = generateSlugFromTitle(source.title);

  const input = {
    slug,
    title: source.title,
    status: "draft" as const,
    migration: {
      sourcePageId: source.pageId,
      extractionConfidence: source.classification.confidence,
      needsReview: source.classification.category === "unresolved_possible_divya_desam",
    },
  };

  return BookSchema.parse(input);
}

/**
 * Transforms a synthetic/real source chapter record into a validated
 * Chapter. Pure function, same contract as transformDivyaDesam.
 */
export function transformChapter(
  source: SourceChapterRecord,
  context: MigrationContext
): Chapter {
  const slug = generateSlugFromTitle(source.title);

  const body = source.contentBlocks
    .filter((block) => block.type === "text" && typeof block.content === "string")
    .map((block) => block.content as string)
    .join("\n\n")
    .trim();

  const images = resolveImageAssets(source.imageAssetRefs, context.imageRegistry, slug);

  const input = {
    title: source.title,
    slug,
    order: source.order,
    status: "draft" as const,
    migration: {
      sourcePageId: source.pageId,
      extractionConfidence: source.classification.confidence,
      needsReview: source.classification.category === "unresolved_possible_divya_desam",
    },
    body,
    images,
  };

  return ChapterSchema.parse(input);
}
