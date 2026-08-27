import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { resolveLastRead } from "../../content-lib/reading-position.ts";
import { resolveBookmarks } from "../../content-lib/bookmarks.ts";
import { ContentCard } from "../../components/ContentCard";
import { layout, spacing, typography, useTheme } from "../../theme";
import { sectionTint } from "../../section-tints.ts";
import { bookCoverAsset } from "../../book-covers.ts";
import { useLanguage } from "../../language-context.ts";
import { useT } from "../../ui-strings.ts";
import { useReadingPosition } from "../../reading-position-context.ts";
import { useBookmarks } from "../../bookmarks-context.ts";

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
 *
 * "Bookmarks" section: chapters explicitly bookmarked from the reader's
 * own header button (library/[book]/[chapter].tsx, BookmarksProvider.tsx)
 * -- deliberately separate from the automatic Continue Reading pointer
 * above. Renders below it (or below Get Started, first-run) only when
 * at least one bookmark still resolves to a real chapter, newest-first;
 * the whole screen is now scrollable since this list has no fixed size.
 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { language } = useLanguage();
  const t = useT();
  const { lastRead } = useReadingPosition();
  const resolved = resolveLastRead(lastRead, language);
  const { bookmarks } = useBookmarks();
  const resolvedBookmarks = resolveBookmarks(bookmarks, language);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>Vedanta Yojana</Text>
        <Text style={[styles.description, { color: theme.colors.muted }]}>
          {resolved ? t("homeContinueSubtitle") : t("homeStartSubtitle")}
        </Text>
      </View>

      {resolved ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>{t("homeContinueReadingLabel")}</Text>
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
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>{t("homeGetStartedLabel")}</Text>
          <ContentCard
            title={t("tabDivyaDesams")}
            subtitle={t("divyaDesamsCardSubtitle")}
            tintColor={sectionTint("divya-desams", theme.scheme)}
            monogram="D"
            onPress={() => router.push("/divya-desams" as never)}
          />
          <ContentCard
            title={t("tabLibrary")}
            subtitle={t("libraryCardSubtitle")}
            tintColor={theme.colors.accent}
            monogram="L"
            onPress={() => router.push("/library" as never)}
          />
        </View>
      )}

      {resolvedBookmarks.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>{t("homeBookmarksLabel")}</Text>
          {resolvedBookmarks.map((bookmark) => (
            <ContentCard
              key={`${bookmark.bookSlug}/${bookmark.chapterSlug}`}
              title={bookmark.chapterTitle}
              subtitle={bookmark.bookTitle}
              tintColor={sectionTint(bookmark.bookSlug, theme.scheme)}
              imageAsset={bookCoverAsset(bookmark.bookSlug)}
              monogram={bookmark.bookTitle.trim().charAt(0).toUpperCase()}
              onPress={() => router.push(`/library/${bookmark.bookSlug}/${bookmark.chapterSlug}` as never)}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: layout.tabBarClearance,
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
