import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ImageEntry } from "../../content-lib/schemas/index.ts";
import { imagesByUuid } from "../content-lib/image-manifest.generated.ts";
import { colors, radius, spacing, typography } from "../theme";

/**
 * Phase 6B -- renders images[] the same way the web app's
 * components/shared/RecordImages.tsx does: resolve `sourceAssetUuid` to
 * an actual local asset, and silently drop any image whose UUID has no
 * matching file rather than render something guaranteed broken. The
 * asset lookup itself is Metro's static import table
 * (mobile/content-lib/image-manifest.generated.ts), not a UUID currently
 * unresolved at runtime.
 *
 * Every migrated image currently has alt: null / altStatus: "needs-review"
 * -- no accessibilityLabel is fabricated; when alt is null the image is
 * still rendered (never hidden) but left without a label, exactly
 * mirroring the web app's documented compromise for RecordImages.tsx.
 */
export function ContentImage({ images }: { images: ImageEntry[] }) {
  const resolved = images.flatMap((image) => {
    const asset = imagesByUuid[image.sourceAssetUuid.toLowerCase()];
    return asset !== undefined ? [{ image, asset }] : [];
  });

  if (resolved.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Images</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {resolved.map(({ image, asset }) => (
          <Image
            key={image.assetId}
            source={asset}
            accessibilityLabel={image.alt ?? undefined}
            style={styles.image}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
    </View>
  );
}

const IMAGE_SIZE = 140;

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  heading: {
    fontSize: typography.heading,
    fontWeight: "600",
    color: colors.foreground,
  },
  row: {
    gap: spacing.sm,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
});
