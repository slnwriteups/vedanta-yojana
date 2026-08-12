import { Stack, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadKnowledge, type Knowledge } from "../../content-lib/loader.ts";
import { ContentCard } from "../../components/ContentCard";
import { colors, spacing, typography } from "../../theme";

/**
 * Phase 6B -- the real Knowledge index. Every record comes from
 * loadKnowledge(); none is hard-coded.
 */
export default function KnowledgeIndexScreen() {
  const router = useRouter();
  const records = loadKnowledge();

  function renderItem({ item }: { item: Knowledge }) {
    return (
      <ContentCard
        title={item.title}
        subtitle={item.contentType}
        status={item.status}
        needsReview={item.migration.needsReview}
        onPress={() => router.push(`/knowledge/${item.slug}` as never)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Knowledge" }} />
      {records.length > 0 ? (
        <FlatList data={records} keyExtractor={(item) => item.slug} renderItem={renderItem} />
      ) : (
        <Text style={styles.empty}>No records are available yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    padding: spacing.lg,
    fontSize: typography.body,
    color: colors.muted,
  },
});
