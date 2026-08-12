import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { loadChapter } from "../../../content-lib/loader.ts";
import { DraftBadge } from "../../../components/DraftBadge";
import { ContentImage } from "../../../components/ContentImage";
import { Section } from "../../../components/Section";
import { colors, spacing, typography } from "../../../theme";

/**
 * Phase 6B -- the real Chapter detail screen. `chapter.body` is rendered
 * via Section with no separate invented heading (the screen's own title
 * already names the chapter) -- no rewriting, spelling correction, or
 * markdown conversion of the stored text, matching the web app's
 * app/library/[book]/[chapter]/page.tsx exactly.
 */
export default function LibraryChapterScreen() {
  const { book: bookSlug, chapter: chapterSlug } = useLocalSearchParams<{
    book: string;
    chapter: string;
  }>();
  const chapter = loadChapter(bookSlug, chapterSlug);

  if (!chapter) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.empty}>This chapter could not be found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: chapter.title }} />
      <View style={styles.header}>
        <DraftBadge status={chapter.status} needsReview={chapter.migration.needsReview} />
        <Text style={styles.title}>{chapter.title}</Text>
      </View>

      <ContentImage images={chapter.images} />

      {chapter.body ? (
        <Section text={chapter.body} />
      ) : (
        <Text style={styles.empty}>No content is available for this chapter yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
    color: colors.foreground,
  },
  empty: {
    fontSize: typography.body,
    color: colors.muted,
  },
});
