import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Post-Phase-6E-C review: reported "for a few temples the pictures have
 * doubled." Investigation found the "108 Divyadesam 2nd Edition" book
 * largely reprints the SAME photographs already present in the original
 * SAP export -- Phase 6E's image merge only checked "is this UUID new,"
 * never "is this visually the same photo as one already on the record,"
 * so it added many re-scans of existing photos as if they were new
 * content. Confirmed empirically: of 174 book-sourced images added in
 * Phase 6E, 149 are near-duplicates of an image the record already had.
 *
 * Detection: perceptual RMSE via ImageMagick's `compare`, computed on a
 * 64x64 grayscale downscale (robust to re-compression/minor cropping
 * between the two scans, which byte-for-byte hashing is not -- verified
 * zero exact byte-hash duplicates existed despite the widespread visual
 * duplication). Threshold 0.10 was chosen empirically: every pair below
 * it was visually confirmed (by direct image comparison) to be the same
 * photograph; the next-closest pairs above it (0.15-0.30 band) were
 * spot-checked and are clearly DIFFERENT photos that merely share
 * similar temple-photography composition/color -- a sharp, well-
 * separated bimodal distribution, not an arbitrary cutoff.
 */

export interface DuplicatePair {
  assetIdA: string;
  assetIdB: string;
  rmse: number;
}

export const DUPLICATE_RMSE_THRESHOLD = 0.1;

function findImageFile(imagesDir: string, uuid: string): string | null {
  const entries = fs.readdirSync(imagesDir);
  const match = entries.find((f) => f.startsWith(`${uuid}.`));
  return match ? path.join(imagesDir, match) : null;
}

function rmseDistance(fileA: string, fileB: string): number | null {
  try {
    execFileSync(
      "compare",
      ["-metric", "RMSE", "-colorspace", "Gray", "-resize", "64x64!", fileA, fileB, "null:"],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    // compare exits 0 when images are identical under the metric; RMSE is still on stderr.
    return 0;
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString() ?? "";
    const match = stderr.match(/\(([\d.]+)\)/);
    return match ? parseFloat(match[1]) : null;
  }
}

/** Finds near-duplicate image pairs WITHIN one record's images[] list. */
export function findDuplicatePairs(
  images: { assetId: string; sourceAssetUuid: string }[],
  imagesDir: string,
  threshold = DUPLICATE_RMSE_THRESHOLD
): DuplicatePair[] {
  const withFiles = images.flatMap((img) => {
    const file = findImageFile(imagesDir, img.sourceAssetUuid);
    return file ? [{ assetId: img.assetId, file }] : [];
  });

  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < withFiles.length; i++) {
    for (let j = i + 1; j < withFiles.length; j++) {
      const rmse = rmseDistance(withFiles[i].file, withFiles[j].file);
      if (rmse !== null && rmse < threshold) {
        pairs.push({ assetIdA: withFiles[i].assetId, assetIdB: withFiles[j].assetId, rmse });
      }
    }
  }
  return pairs;
}
