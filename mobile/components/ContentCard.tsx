import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { layout, radius, spacing, typography, useTheme } from "../theme";
import { DraftBadge } from "./DraftBadge";

/**
 * Phase 6C -- the reusable list-row card, now with an optional thumbnail
 * (`imageAsset`) for records that have a resolvable image (Divya Desams).
 * A record with no image renders exactly as it did in Phase 6B -- no
 * placeholder icon is invented for a missing photo. Meets the
 * accessibility minimum touch target (layout.minTouchTarget) and exposes
 * a single combined accessibilityLabel so a screen reader announces the
 * whole card as one row, not fragments.
 */
export function ContentCard({
  title,
  subtitle,
  status,
  needsReview,
  imageAsset,
  onPress,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  needsReview?: boolean;
  imageAsset?: number | null;
  onPress: () => void;
}) {
  const theme = useTheme();
  const isDraft = status === "draft";
  const a11yLabel = [title, subtitle, isDraft ? "Draft, under review" : null].filter(Boolean).join(". ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.card,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.background : theme.colors.surface,
        },
      ]}
    >
      {imageAsset ? (
        <Image source={imageAsset} style={[styles.thumb, { backgroundColor: theme.colors.border }]} resizeMode="cover" />
      ) : null}
      <View style={styles.textBlock}>
        {status ? <DraftBadge status={status} needsReview={needsReview ?? false} /> : null}
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: layout.minTouchTarget,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.body,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: typography.small,
  },
});
