import type {
  SourceClassification,
  SourceContentBlock,
  SourceDivyaDesamRecord,
  SourceExternalLink,
  SourceImageRegistry,
} from "../types.ts";

/**
 * Adapts real `content-extraction/` JSON shapes into the Phase 5E
 * source-shaped transformation input. This is deliberately SEPARATE from
 * the pure transformation functions (`../divya-desam.ts` etc.) — per
 * Phase 5F section 5, those must never contain Page5-specific or even
 * extraction-shape-specific logic. This adapter is the one place that
 * knows about the real `content-extraction/` JSON field names
 * (`order`/`depth`/`textFontSizeHint`, the `classification.evidence`
 * object, `image-map.json`'s `localFile` structure, etc.) and discards
 * whatever the transformation layer doesn't need.
 *
 * This adapter is generic — it works for any single
 * `content-extraction/divya-desams/<pageId>.json` record, not only
 * Page5. The restriction to exactly one record (Page5) is enforced by
 * the caller (`../migrate-page5.ts`), not by this module.
 *
 * This module performs NO filesystem access itself — it only transforms
 * already-parsed JSON values passed in as arguments.
 */

// ---------------------------------------------------------------------------
// Raw shapes (only the fields this adapter actually reads)
// ---------------------------------------------------------------------------

export interface RawExtractionContentBlock {
  type: string;
  content?: string;
  label?: string;
  imageAssetRef?: string;
  // order/depth/textFontSizeHint intentionally not modeled -- presentation
  // metadata, never read by this adapter or the transformation layer.
  [key: string]: unknown;
}

export interface RawExtractionExternalLink {
  url: string;
  resourceType: string;
  sourceComponentLabel: string | null;
  [key: string]: unknown;
}

export interface RawExtractionDivyaDesamRecord {
  pageId: string;
  title: string;
  classification: {
    category: string;
    confidence: "high" | "low";
    [key: string]: unknown; // evidence/method intentionally ignored
  };
  imageAssetRefs: string[];
  externalLinks: RawExtractionExternalLink[];
  contentBlocks: RawExtractionContentBlock[];
  [key: string]: unknown; // containsPlaceholderText/sourceLocation/internalNavigationOutEdges intentionally ignored
}

export interface RawExternalLinkRecord {
  url: string;
  pageId: string;
  resourceType: string;
  sourceComponentLabel: string | null;
  [key: string]: unknown;
}

export interface RawImageMapEntry {
  assetUuid: string;
  sourceOriginalName: string | null;
  localFile: { extensionMismatch: boolean } | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Adapter functions
// ---------------------------------------------------------------------------

/**
 * Adapts one raw content-extraction Divya Desam record into the Phase 5E
 * source shape.
 *
 * `crossReferenceLinks` should be the subset of
 * `resources/external-links.json`'s `links` array belonging to this same
 * `pageId` — an independently-extracted view of the same data (derived
 * from the SAP flow graph directly, rather than assembled per-page). Each
 * of the record's own `externalLinks` entries is required to have a
 * matching cross-reference entry with the SAME pageId; a mismatch or a
 * missing cross-reference throws immediately rather than silently
 * proceeding. This is a genuine integrity check between two independently
 * produced extraction artifacts, not a tautological self-comparison.
 */
export function adaptExtractionDivyaDesamRecord(
  raw: RawExtractionDivyaDesamRecord,
  crossReferenceLinks: RawExternalLinkRecord[]
): SourceDivyaDesamRecord {
  const classification: SourceClassification = {
    category: raw.classification.category,
    confidence: raw.classification.confidence,
  };

  const contentBlocks: SourceContentBlock[] = raw.contentBlocks.map((block) => {
    const adapted = { type: block.type } as SourceContentBlock;
    if (typeof block.content === "string") adapted.content = block.content;
    if (typeof block.label === "string") adapted.label = block.label;
    if (typeof block.imageAssetRef === "string") adapted.imageAssetRef = block.imageAssetRef;
    return adapted;
  });

  const externalLinks: SourceExternalLink[] = raw.externalLinks.map((link) => {
    const crossRef = crossReferenceLinks.find((l) => l.url === link.url);
    if (!crossRef) {
      throw new Error(
        `Adapter integrity check failed: link "${link.url}" from ${raw.pageId}'s own ` +
          `record was not found among resources/external-links.json's entries for ${raw.pageId}.`
      );
    }
    if (crossRef.pageId !== raw.pageId) {
      throw new Error(
        `Adapter integrity check failed: link "${link.url}" is associated with pageId ` +
          `"${crossRef.pageId}" in resources/external-links.json, but appears inside ${raw.pageId}'s own record.`
      );
    }
    return {
      url: link.url,
      resourceType: link.resourceType as SourceExternalLink["resourceType"],
      sourceComponentLabel: link.sourceComponentLabel,
      pageId: crossRef.pageId,
    };
  });

  return {
    pageId: raw.pageId,
    title: raw.title,
    classification,
    imageAssetRefs: raw.imageAssetRefs,
    externalLinks,
    contentBlocks,
  };
}

/**
 * Builds a Phase 5E image registry scoped to exactly the given UUIDs
 * (typically one record's own `imageAssetRefs`) by looking each one up in
 * `image-map.json`'s `images` array. Throws immediately if any requested
 * UUID has no corresponding entry -- never silently drops a reference.
 */
export function adaptImageRegistry(
  rawImages: RawImageMapEntry[],
  relevantUuids: string[]
): SourceImageRegistry {
  const registry: SourceImageRegistry = new Map();
  for (const uuid of relevantUuids) {
    const entry = rawImages.find((img) => img.assetUuid === uuid);
    if (!entry) {
      throw new Error(
        `Adapter integrity check failed: no image-map.json entry found for asset UUID "${uuid}".`
      );
    }
    if (!entry.sourceOriginalName) {
      throw new Error(
        `Adapter integrity check failed: image-map.json entry for "${uuid}" has no sourceOriginalName.`
      );
    }
    registry.set(uuid, {
      assetUuid: entry.assetUuid,
      sourceOriginalName: entry.sourceOriginalName,
      extensionMismatch: entry.localFile?.extensionMismatch ?? false,
    });
  }
  return registry;
}
