import { Stack, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadKnowledge, type Knowledge } from "../../../content-lib/loader.ts";
import { ContentCard } from "../../../components/ContentCard";
import { layout, typography, useTheme } from "../../../theme";

/** Phase 6C -- unchanged data behavior from Phase 6B, theme-aware styling only. */
export default function KnowledgeIndexScreen() {
  const router = useRouter();
  const theme = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Knowledge" }} />
      {records.length > 0 ? (
        <FlatList data={records} keyExtractor={(item) => item.slug} renderItem={renderItem} />
      ) : (
        <Text style={[styles.empty, { color: theme.colors.muted }]}>No records are available yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    padding: layout.screenPadding,
    fontSize: typography.body,
  },
});
