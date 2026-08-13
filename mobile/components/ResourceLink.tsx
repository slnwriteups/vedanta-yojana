import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { layout, spacing, typography, useTheme } from "../theme";

/**
 * One small external-link row, reused for both a Divya Desam's Maps
 * shrine links and its language-tagged Resource links. The caller
 * resolves the display label so this component stays content-type
 * agnostic. Announces "opens in browser" to screen readers, matching the
 * web app's visually-hidden "(opens in a new tab)" suffix in spirit.
 */
export function ResourceLink({ label, url }: { label: string; url: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={`${label}, opens in browser`}
      style={styles.link}
    >
      <Text style={[styles.label, { color: theme.colors.accent }]}>{label} ↗</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    paddingVertical: spacing.sm,
    minHeight: layout.minTouchTarget,
    justifyContent: "center",
  },
  label: {
    fontSize: typography.body,
    fontWeight: "500",
  },
});
