import type { ImageEntry } from "../../content-lib/schemas/index.ts";
import { MissingImageAssetError } from "./errors.ts";
import type { SourceImageRegistry } from "./types.ts";

/**
 * Resolves one source `ag-asset://` UUID into a destination ImageEntry.
 *
 * Deterministic by construction: `assetId` is derived purely from the
 * destination record's own slug and the image's position within that
 * record's own `imageAssetRefs` list (`<record-slug>-<sequence>`) — never
 * a random UUID, never a timestamp, never dependent on filesystem
 * enumeration order. The same (sourceAssetUuid, recordSlug, sequence)
 * input always produces the same output.
 *
 * `sourceAssetUuid` is preserved unchanged, so the same underlying source
 * asset can be correctly recognized as "the same image" across multiple
 * destination records even though each record gets its own record-scoped
 * `assetId`. Nothing here renames, re-encodes, or otherwise modifies the
 * asset's identity — an `extensionMismatch` flag on the registry entry
 * (if present) is informational only and never changes the resolution.
 */
export function resolveImageAsset(
  sourceAssetUuid: string,
  registry: SourceImageRegistry,
  recordSlug: string,
  sequence: number
): ImageEntry {
  const entry = registry.get(sourceAssetUuid);
  if (!entry) {
    throw new MissingImageAssetError(sourceAssetUuid);
  }

  return {
    assetId: `${recordSlug}-${sequence}`,
    sourceAssetUuid: entry.assetUuid,
    sourceOriginalName: entry.sourceOriginalName,
    alt: null,
    altStatus: "needs-review",
  };
}

/**
 * Resolves an ordered list of source UUIDs for one destination record.
 * `sequence` is 1-based and scoped to this call's own list (i.e. this
 * record's own imageAssetRefs), matching resolveImageAsset's contract.
 */
export function resolveImageAssets(
  sourceAssetUuids: string[],
  registry: SourceImageRegistry,
  recordSlug: string
): ImageEntry[] {
  return sourceAssetUuids.map((uuid, index) =>
    resolveImageAsset(uuid, registry, recordSlug, index + 1)
  );
}
