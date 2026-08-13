import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { loadKnowledgeRecord } from "../../../content-lib/loader.ts";
import { DraftBadge } from "../../../components/DraftBadge";
import { ContentImage } from "../../../components/ContentImage";
import { Section } from "../../../components/Section";
import { layout, spacing, typography, useTheme } from "../../../theme";

const INTRODUCTION_SLUG = "introduction";

/**
 * A static route co-located with [slug].tsx, resolving the exact same
 * "introduction" Knowledge record previously served from the (now
 * removed) Knowledge tab -- moved here because its own content serves
 * this section specifically, mirroring app/divya-desams/introduction/
 * page.tsx on the web.
 */
export default function DivyaDesamsIntroductionScreen() {
  const theme = useTheme();
  const record = loadKnowledgeRecord(INTRODUCTION_SLUG);

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
