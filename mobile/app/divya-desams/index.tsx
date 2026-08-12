import { Stack, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadDivyaDesams, type DivyaDesam } from "../../content-lib/loader.ts";
import { sourcePageNumber } from "../../content-lib/ordering.ts";
import { ContentCard } from "../../components/ContentCard";
import { colors, spacing, typography } from "../../theme";

/**
 * Phase 6B -- the real Divya Desam index. Every record comes from
 * loadDivyaDesams(); none is hard-coded. Ordered by
 * migration.sourcePageId (the traditional pilgrimage sequence, not
 * alphabetical), the identical rule and regex as the web app's
 * app/divya-desams/page.tsx -- see content-lib/ordering.ts.
 */
export default function DivyaDesamsIndexScreen() {
  const router = useRouter();
  const records = [...loadDivyaDesams()].sort(
    (a, b) => sourcePageNumber(a.migration.sourcePageId) - sourcePageNumber(b.migration.sourcePageId)
  );

  function renderItem({ item }: { item: DivyaDesam }) {
    return (
      <ContentCard
        title={item.displayName}
        subtitle={item.templeInformation.moolavar}
        status={item.status}
        needsReview={item.migration.needsReview}
        onPress={() => router.push(`/divya-desams/${item.slug}` as never)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Divya Desams" }} />
      <Text style={styles.count}>{records.length} records</Text>
      <FlatList data={records} keyExtractor={(item) => item.slug} renderItem={renderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  count: {
    fontSize: typography.small,
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
