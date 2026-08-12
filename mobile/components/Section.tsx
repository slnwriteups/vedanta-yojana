import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";

/**
 * Phase 6B -- generic content section: an optional heading over either
 * long-form `text` (paragraph-preserving, mirroring the web app's
 * components/shared/LongFormSection.tsx: split only on existing blank
 * lines, no rewriting/trimming/markdown conversion of the source prose)
 * or arbitrary `children` (used for Images/Maps/Resources sections that
 * aren't a single text field). Renders nothing when there is no text and
 * no children, so callers can pass an absent optional field straight
 * through without an extra guard at every call site.
 */
export function Section({
  heading,
  text,
  children,
}: {
  heading?: string;
  text?: string;
  children?: ReactNode;
}) {
  if (!text && !children) return null;

  return (
    <View style={styles.section}>
      {heading ? <Text style={styles.heading}>{heading}</Text> : null}
      {text
        ? text.split(/\n{2,}/).map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))
        : children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  heading: {
    fontSize: typography.heading,
    fontWeight: "600",
    color: colors.foreground,
  },
  paragraph: {
    fontSize: typography.body,
    lineHeight: typography.body * 1.5,
    color: colors.foreground,
  },
});
