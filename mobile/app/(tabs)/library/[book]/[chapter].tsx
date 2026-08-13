import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { loadChapter } from "../../../../content-lib/loader.ts";
import { DraftBadge } from "../../../../components/DraftBadge";
import { ContentImage } from "../../../../components/ContentImage";
import { Section } from "../../../../components/Section";
import { layout, spacing, typography, useTheme } from "../../../../theme";

/**
 * Phase 6C -- the reading-comfort pass the brief asks for: a capped
 * reading measure (layout.maxContentWidth, centered), generous vertical
 * rhythm between paragraphs (Section already applies
 * typography.readingLineHeight), and a clear chapter header separated
 * from the body by real space rather than a thin rule. The chapter text
 * itself is completely untouched -- Section still only splits on
 * existing blank lines, never rewrites/summarizes/alters anything.
 */
export default function LibraryChapterScreen() {
  const { book: bookSlug, chapter: chapterSlug } = useLocalSearchParams<{
    book: string;
    chapter: string;
  }>();
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
});
