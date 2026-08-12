import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { loadKnowledgeRecord } from "../../content-lib/loader.ts";
import { DraftBadge } from "../../components/DraftBadge";
import { ContentImage } from "../../components/ContentImage";
import { Section } from "../../components/Section";
import { colors, spacing, typography } from "../../theme";

/**
 * Phase 6B -- the real Knowledge detail screen: title, content type,
 * body, images -- exactly the fields the brief specifies, nothing
 * fabricated for a field the record doesn't have.
 */
export default function KnowledgeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const record = loadKnowledgeRecord(slug);

  if (!record) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.empty}>This record could not be found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: record.title }} />
      <View style={styles.header}>
        <DraftBadge status={record.status} needsReview={record.migration.needsReview} />
        <Text style={styles.title}>{record.title}</Text>
        <Text style={styles.contentType}>{record.contentType}</Text>
      </View>

      <ContentImage images={record.images} />

      {record.body ? (
        <Section text={record.body} />
      ) : (
        <Text style={styles.empty}>No content is available yet.</Text>
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
  contentType: {
    fontSize: typography.small,
    color: colors.muted,
    textTransform: "capitalize",
  },
  empty: {
    fontSize: typography.body,
    color: colors.muted,
  },
});
