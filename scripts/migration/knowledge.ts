import { KnowledgeSchema, type Knowledge } from "../../content-lib/schemas/index.ts";
import { resolveImageAssets } from "./images.ts";
import { generateSlugFromTitle } from "./slug.ts";
import type { MigrationContext, SourceKnowledgeRecord } from "./types.ts";

/** Transforms a synthetic/real source Knowledge record into a validated Knowledge object. */
export function transformKnowledge(
  source: SourceKnowledgeRecord,
  context: MigrationContext
): Knowledge {
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
    contentType: source.contentType,
    status: "draft" as const,
    migration: {
      sourcePageId: source.pageId,
      extractionConfidence: source.classification.confidence,
      needsReview: source.classification.category === "unresolved_possible_divya_desam",
    },
    body,
    images,
    relatedContent: [],
  };

  return KnowledgeSchema.parse(input);
}
