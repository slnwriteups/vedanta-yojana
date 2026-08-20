import * as Haptics from "expo-haptics";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { layout, radius, spacing, typography, useTheme } from "../theme";
import { shadows } from "../shadows";
import { DraftBadge } from "./DraftBadge";

/**
 * Phase 6C -- the reusable list-row card, now with an optional thumbnail
 * (`imageAsset`) for records that have a resolvable image (Divya Desams).
 * A record with no image renders exactly as it did in Phase 6B -- no
 * placeholder icon is invented for a missing photo. Meets the
 * accessibility minimum touch target (layout.minTouchTarget) and exposes
 * a single combined accessibilityLabel so a screen reader announces the
 * whole card as one row, not fragments.
 *
 * UI/UX pass: each row is now its own separated, rounded card
 * (shadows.card) with breathing room between them, rather than a flat
 * hairline-divided strip -- the difference between a settings list and
 * a content-browsing list. Still just one shared component, so this
 * benefits every screen that renders one (Library's book/chapter
 * lists, Divya Desams) at once.
 *
 * `tintColor` (optional): a thin colored left-edge stripe identifying
 * which section/book a row belongs to (section-tints.ts) -- a
 * restrained wayfinding cue, not a full background-color treatment,
 * so it never fights with a real thumbnail photo or affects text
 * contrast. When a book has no cover image, the same tint also fills
 * a monogram swatch (`monogram`) in place of the empty thumbnail slot.
 *
 * A light haptic (expo-haptics) fires on every tap, alongside the
 * existing onPress -- since this one component backs nearly every
 * tappable row in the app (Home, Library, Divya Desams), this single
 * change gives the whole app a consistent tactile feel.
 */
export function ContentCard({
  title,
  subtitle,
  status,
  needsReview,
  imageAsset,
  tintColor,
  monogram,
  onPress,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  needsReview?: boolean;
  imageAsset?: number | null;
  tintColor?: string;
  monogram?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const isDraft = status === "draft";
  const a11yLabel = [title, subtitle, isDraft ? "Draft, under review" : null].filter(Boolean).join(". ");

  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.card,
        shadows.card,
        {
          backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
          borderLeftWidth: tintColor ? 4 : 0,
          borderLeftColor: tintColor ?? "transparent",
        },
      ]}
    >
      {imageAsset ? (
        <Image source={imageAsset} style={[styles.thumb, { backgroundColor: theme.colors.border }]} resizeMode="cover" />
      ) : monogram && tintColor ? (
        <View style={[styles.thumb, styles.monogram, { backgroundColor: tintColor }]}>
          <Text style={styles.monogramText}>{monogram}</Text>
        </View>
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
    padding: spacing.md,
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    minHeight: layout.minTouchTarget,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  monogram: {
    alignItems: "center",
    justifyContent: "center",
  },
  monogramText: {
    color: "#fffaf5",
    fontSize: typography.heading,
    fontWeight: "700",
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
