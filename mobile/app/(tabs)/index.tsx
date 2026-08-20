import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { resolveLastRead } from "../../content-lib/reading-position.ts";
import { ContentCard } from "../../components/ContentCard";
import { layout, spacing, typography, useTheme } from "../../theme";
import { sectionTint } from "../../section-tints.ts";
import { bookCoverAsset } from "../../book-covers.ts";
import { useLanguage } from "../../language-context.ts";
import { useReadingPosition } from "../../reading-position-context.ts";

/**
 * UI/UX pass: Home used to just re-list Divya Desams/Library/Search --
 * the exact same three destinations already one tap away in the
 * bottom tab bar, adding a screen without adding value. It's now
 * "Continue Reading": the last chapter the reader had open (tracked by
 * ReadingPositionProvider, recorded from library/[book]/[chapter].tsx
 * on every view), resolved fresh via resolveLastRead so a since-edited
 * or removed chapter never shows a stale title.
 *
 * With no reading history yet -- a fresh install, or a saved position
 * that no longer resolves -- there's nothing to continue, so Home
 * shows two real entry points (Divya Desams, Library) instead: unlike
 * the old three-card menu, this is conditional first-run guidance, not
 * a permanent duplicate of the tab bar -- it disappears for good the
 * moment a reader opens their first chapter.
 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { language } = useLanguage();
  const { lastRead } = useReadingPosition();
  const resolved = resolveLastRead(lastRead, language);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>Vedanta Yojana</Text>
        <Text style={[styles.description, { color: theme.colors.muted }]}>
          {resolved
            ? "Pick up right where you left off."
            : "A reference for Divya Desams, the Library, and supporting Knowledge material."}
        </Text>
      </View>

      {resolved ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>Continue Reading</Text>
          <ContentCard
            title={resolved.chapterTitle}
            subtitle={resolved.bookTitle}
            tintColor={sectionTint(resolved.bookSlug, theme.scheme)}
            imageAsset={bookCoverAsset(resolved.bookSlug)}
            monogram={resolved.bookTitle.trim().charAt(0).toUpperCase()}
            onPress={() => router.push(`/library/${resolved.bookSlug}/${resolved.chapterSlug}` as never)}
          />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>Get Started</Text>
          <ContentCard
            title="Divya Desams"
            subtitle="The 108 sacred abodes of Vishnu venerated by the Alwars."
            tintColor={sectionTint("divya-desams", theme.scheme)}
            monogram="D"
            onPress={() => router.push("/divya-desams" as never)}
          />
          <ContentCard
            title="Library"
            subtitle="Sacred texts and teachings, presented chapter by chapter."
            tintColor={theme.colors.accent}
            monogram="L"
            onPress={() => router.push("/library" as never)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.title + 4,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  description: {
    fontSize: typography.body,
    lineHeight: typography.body * typography.readingLineHeight,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.eyebrow,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: layout.screenPadding,
  },
});
