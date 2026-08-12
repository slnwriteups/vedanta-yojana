import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { colors, spacing, typography } from "../theme";

/**
 * Phase 6B -- one small external-link row, reused for both a Divya
 * Desam's Maps shrine links and its language-tagged Resource links (the
 * two "external URL" cases in the schema). The caller resolves the
 * display label (e.g. `resource.sourceLabel ?? resource.language`, or
 * `shrine.label ?? "Shrine"`) so this component stays content-type
 * agnostic rather than knowing about ResourceEntry/Shrine shapes itself.
 */
export function ResourceLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={styles.link}>
      <Text style={styles.label}>{label} ↗</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: typography.body,
    color: colors.accent,
    fontWeight: "500",
  },
});
