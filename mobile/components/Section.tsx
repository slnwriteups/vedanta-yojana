import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing, typography, useTheme } from "../theme";
import { useReadingPreferences } from "../preferences-context.ts";

/**
 * Generic content section: an optional heading over either long-form
 * `text` (paragraph-preserving, mirroring the web app's
 * components/shared/LongFormSection.tsx: split only on existing blank
 * lines -- no rewriting/trimming/markdown conversion of the source
 * prose) or arbitrary `children`. Renders nothing when there is neither.
 *
 * Phase 6C reading-comfort pass: capped measure (layout.maxContentWidth,
 * applied by the screen, not here) plus a taller line-height
 * (typography.readingLineHeight) specifically for long-form paragraphs --
 * short "strong"-tier text elsewhere in the app doesn't use this.
 *
 * Phase 6D: paragraph font size now scales by the user's persisted
 * reading preference (content-lib/preferences.ts's FONT_SCALE_STEPS,
 * set from Home). The heading and the underlying text itself are
 * unaffected -- only the paragraph font size, never the content.
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
  const theme = useTheme();
  const { preferences } = useReadingPreferences();
  if (!text && !children) return null;

  return (
    <View style={styles.section} accessible={false}>
      {heading ? (
        <Text
          style={[styles.heading, { color: theme.colors.foreground }]}
          accessibilityRole="header"
        >
          {heading}
        </Text>
      ) : null}
      {text
        ? text.split(/\n{2,}/).map((paragraph, index) => (
            <Text
              key={index}
              style={[
                styles.paragraph,
                {
                  color: theme.colors.foreground,
                  fontSize: typography.body * preferences.fontScale,
                  lineHeight: typography.body * preferences.fontScale * typography.readingLineHeight,
                },
              ]}
            >
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
  },
  paragraph: {
    fontSize: typography.body,
    lineHeight: typography.body * typography.readingLineHeight,
  },
});
