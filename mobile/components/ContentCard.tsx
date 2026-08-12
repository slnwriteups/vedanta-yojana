import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";
import { DraftBadge } from "./DraftBadge";

/**
 * Phase 6B -- one reusable list-row card for every index screen (Divya
 * Desams, Library, Knowledge, Search results). Only `title` is required;
 * everything else renders conditionally so a record missing a field never
 * shows a fabricated placeholder.
 */
export function ContentCard({
  title,
  subtitle,
  status,
  needsReview,
  onPress,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  needsReview?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.textBlock}>
        {status ? <DraftBadge status={status} needsReview={needsReview ?? false} /> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    backgroundColor: colors.background,
  },
  textBlock: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.body,
    fontWeight: "600",
    color: colors.foreground,
  },
  subtitle: {
    fontSize: typography.small,
    color: colors.muted,
  },
});
