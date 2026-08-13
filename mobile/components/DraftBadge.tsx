import { StyleSheet, Text } from "react-native";
import { typography, useTheme } from "../theme";

/**
 * Mirrors the exact condition and copy of the web app's
 * components/shared/DraftBadge.tsx: renders only when status is "draft",
 * with an additional "flagged for additional review" clause when
 * needsReview is true. Internal migration metadata is never surfaced.
 */
export function DraftBadge({ status, needsReview }: { status: string; needsReview: boolean }) {
  const theme = useTheme();
  if (status !== "draft") return null;

  return (
    <Text
      style={[styles.text, { color: theme.colors.muted }]}
      accessibilityRole="text"
      accessibilityLabel={`Draft, under review${needsReview ? ", flagged for additional review" : ""}`}
    >
      Draft — under review{needsReview ? " · flagged for additional review" : ""}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: typography.eyebrow,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
