import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { loadKnowledgeRecord } from "../../../content-lib/loader.ts";
import { DraftBadge } from "../../../components/DraftBadge";
import { ContentImage } from "../../../components/ContentImage";
import { Section } from "../../../components/Section";
import { layout, spacing, typography, useTheme } from "../../../theme";

/**
 * Phase 6C -- article-style layout: content type shown as a small
 * eyebrow-style label above the title (a common article-page convention)
 * rather than a plain caption line, same capped reading measure as the
 * chapter screen. Fields unchanged from Phase 6B: title, content type,
 * body, images -- no relatedContent section, matching Phase 6B's
 * deliberate scoping to exactly what the brief specified.
 */
export default function KnowledgeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const record = loadKnowledgeRecord(slug);

  if (!record) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={[styles.empty, { color: theme.colors.muted }]}>This record could not be found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: record.title }} />
      <View style={styles.header}>
        <Text style={[styles.contentType, { color: theme.colors.accent }]}>{record.contentType}</Text>
        <DraftBadge status={record.status} needsReview={record.migration.needsReview} />
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{record.title}</Text>
      </View>

      <ContentImage images={record.images} />

      {record.body ? (
        <Section text={record.body} />
      ) : (
        <Text style={[styles.empty, { color: theme.colors.muted }]}>No content is available yet.</Text>
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
    gap: spacing.xs,
  },
  contentType: {
    fontSize: typography.eyebrow,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
  },
  empty: {
    fontSize: typography.body,
  },
});
