import { DivyaDesamSchema, type DivyaDesam } from "../../content-lib/schemas/index.ts";
import { AmbiguousLabelError, LinkAssociationMismatchError } from "./errors.ts";
import { resolveImageAssets } from "./images.ts";
import { transformMapsLink, transformPdfResource } from "./links.ts";
import { generateSlugFromTitle } from "./slug.ts";
import { parseTempleDetails, type ParsedTempleDetails } from "./text-parser.ts";
import type { MigrationContext, SourceDivyaDesamRecord } from "./types.ts";

/**
 * Transforms one synthetic/real extracted source record into a validated
 * DivyaDesam. Pure function: no filesystem access, no network access, no
 * dependency on `content-extraction/` — everything it needs is passed in
 * as `source` and `context`. Phase 5F will call this exact function
 * against exactly one real record (Sri Rangam) before it is ever used
 * against the full 108-record set.
 *
 * MULTI-SHRINE AMBIGUOUS-LABEL FALLBACK (discovered in Phase 5H, running
 * against all 108 real records): a small number of multi-shrine temples
 * (e.g. "Tanjai Mamanikoyil", "Tiruvaali Tirunagari") have MORE THAN ONE
 * complete "Moolavar:"/"Thayaar:"/etc. section in their combined text --
 * one per shrine -- which `parseTempleDetails` correctly refuses to guess
 * between (see AmbiguousLabelError). Splitting these into multiple
 * DivyaDesam records is explicitly forbidden (the non-negotiable
 * multi-shrine rule), and a single flat `templeInformation` object cannot
 * safely represent per-shrine fields without picking a winner. Rather
 * than crash the whole migration over this narrow, well-understood case,
 * this function catches exactly `AmbiguousLabelError` from the temple-
 * details parse step and falls back to omitting `templeInformation`/
 * `sthalaPuranam`/`azhwarPasuram` entirely (never guessed, never
 * fabricated, never partially/incorrectly merged) while forcing
 * `needsReview: true` regardless of the source's extraction confidence.
 * Everything else about the record (shrines, images, resources, slug,
 * displayName) is unaffected and still fully populated.
 */
export function transformDivyaDesam(
  source: SourceDivyaDesamRecord,
  context: MigrationContext
): DivyaDesam {
  const slug = generateSlugFromTitle(source.title);

  // Verify every link genuinely belongs to this record before using it,
  // rather than trusting an implicit association.
  for (const link of source.externalLinks) {
    if (link.pageId !== undefined && link.pageId !== source.pageId) {
      throw new LinkAssociationMismatchError(source.pageId, link.pageId, link.url);
    }
  }

  // Only "text" blocks become content. "button"/"picture"/"icon"/"layout"/
  // "view" blocks are presentation/asset metadata, never destination text.
  const combinedText = source.contentBlocks
    .filter((block) => block.type === "text" && typeof block.content === "string")
    .map((block) => block.content as string)
    .join("\n\n");

  let parsed: ParsedTempleDetails;
  let ambiguousStructuredText = false;
  try {
    parsed = parseTempleDetails(combinedText);
  } catch (err) {
    if (err instanceof AmbiguousLabelError) {
      ambiguousStructuredText = true;
      parsed = { templeInformation: {} };
    } else {
      throw err;
    }
  }
  const { templeInformation, sthalaPuranam, azhwarPasuram } = parsed;

  const shrines = source.externalLinks
    .filter((link) => link.resourceType === "google_maps_location")
    .map(transformMapsLink);

  const resources = source.externalLinks
    .filter((link) => link.resourceType === "sloka_pdf_prapatti")
    .map(transformPdfResource);

  const images = resolveImageAssets(source.imageAssetRefs, context.imageRegistry, slug);

  const needsReview =
    source.classification.category === "unresolved_possible_divya_desam" || ambiguousStructuredText;

  const input = {
    slug,
    displayName: source.title,
    status: "draft" as const,
    migration: {
      sourcePageId: source.pageId,
      extractionConfidence: source.classification.confidence,
      needsReview,
    },
    templeInformation,
    sthalaPuranam,
    azhwarPasuram,
    shrines,
    images,
    resources,
    relatedContent: [],
  };

  // Every transformation is validated through the exact Phase 5C schema —
  // no duplicated/parallel validation logic.
  return DivyaDesamSchema.parse(input);
}
