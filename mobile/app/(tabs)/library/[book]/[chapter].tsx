import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { loadChapter, loadChapters } from "../../../../content-lib/loader.ts";
import { findAdjacentChapters } from "../../../../content-lib/chapter-navigation.ts";
import { DraftBadge } from "../../../../components/DraftBadge";
import { ContentImage } from "../../../../components/ContentImage";
import { Section } from "../../../../components/Section";
import { layout, radius, spacing, typography, useTheme } from "../../../../theme";

/**
 * Phase 6C -- the reading-comfort pass the brief asks for: a capped
 * reading measure (layout.maxContentWidth, centered), generous vertical
 * rhythm between paragraphs (Section already applies
 * typography.readingLineHeight), and a clear chapter header separated
 * from the body by real space rather than a thin rule. The chapter text
 * itself is completely untouched -- Section still only splits on
 * existing blank lines, never rewrites/summarizes/alters anything.
 *
 * Phase 6D -- previous/next chapter navigation (content-lib/
 * chapter-navigation.ts's pure findAdjacentChapters, over the same
 * ascending `order` loadChapters() already returns -- never re-sorted).
 * router.replace (not push) so the back button still returns to the
 * book's chapter list after paging through several chapters, rather than
 * growing a long stack of visited chapters. AccessibilityInfo
 * .announceForAccessibility fires the new chapter's title so a
 * VoiceOver/TalkBack user gets a spoken navigation announcement, since a
 * replace-based route change doesn't move focus the way a fresh screen
 * push does.
 */
export default function LibraryChapterScreen() {
  const { book: bookSlug, chapter: chapterSlug } = useLocalSearchParams<{
    book: string;
    chapter: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const chapter = loadChapter(bookSlug, chapterSlug);

  if (!chapter) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={[styles.empty, { color: theme.colors.muted }]}>This chapter could not be found.</Text>
      </View>
    );
  }

  const { previous, next } = findAdjacentChapters(loadChapters(bookSlug), chapterSlug);

  function goTo(targetSlug: string, title: string) {
    router.replace(`/library/${bookSlug}/${targetSlug}` as never);
    AccessibilityInfo.announceForAccessibility(`Now reading: ${title}`);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: chapter.title }} />
      <View style={styles.header}>
        <DraftBadge status={chapter.status} needsReview={chapter.migration.needsReview} />
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{chapter.title}</Text>
      </View>

      <ContentImage images={chapter.images} />

      {chapter.body ? (
        <Section text={chapter.body} />
      ) : (
        <Text style={[styles.empty, { color: theme.colors.muted }]}>
          No content is available for this chapter yet.
        </Text>
      )}

      {previous || next ? (
        <View style={styles.pager}>
          {previous ? (
            <Pressable
              onPress={() => goTo(previous.slug, previous.title)}
              accessibilityRole="button"
              accessibilityLabel={`Previous chapter: ${previous.title}`}
              style={[styles.pagerButton, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.pagerDirection, { color: theme.colors.muted }]}>Previous</Text>
              <Text style={[styles.pagerTitle, { color: theme.colors.accent }]} numberOfLines={1}>
                {previous.title}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.pagerButton} />
          )}
          {next ? (
            <Pressable
              onPress={() => goTo(next.slug, next.title)}
              accessibilityRole="button"
              accessibilityLabel={`Next chapter: ${next.title}`}
              style={[styles.pagerButton, styles.pagerButtonEnd, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.pagerDirection, { color: theme.colors.muted }]}>Next</Text>
              <Text style={[styles.pagerTitle, { color: theme.colors.accent }]} numberOfLines={1}>
                {next.title}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.pagerButton} />
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
  },
  empty: {
    fontSize: typography.body,
  },
  pager: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  pagerButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: layout.minTouchTarget,
    gap: spacing.xs,
  },
  pagerButtonEnd: {
    alignItems: "flex-end",
  },
  pagerDirection: {
    fontSize: typography.eyebrow,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pagerTitle: {
    fontSize: typography.small,
    fontWeight: "600",
  },
});
