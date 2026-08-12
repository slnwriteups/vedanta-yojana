import { StyleSheet, Text } from "react-native";
import { colors, typography } from "../theme";

/**
 * Phase 6B -- mirrors the exact condition and copy of the web app's
 * components/shared/DraftBadge.tsx: renders only when status is "draft",
 * with an additional "flagged for additional review" clause when
 * needsReview is true. Internal migration metadata (sourcePageId,
 * extractionConfidence) is never surfaced here, matching the web version.
 */
export function DraftBadge({ status, needsReview }: { status: string; needsReview: boolean }) {
  if (status !== "draft") return null;

  return (
    <Text style={styles.text}>
      Draft — under review{needsReview ? " · flagged for additional review" : ""}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: typography.eyebrow,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
