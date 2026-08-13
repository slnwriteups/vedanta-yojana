import { Stack, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadDivyaDesams, type DivyaDesam } from "../../../content-lib/loader.ts";
import { sourcePageNumber } from "../../../content-lib/ordering.ts";
import { imagesByUuid } from "../../../content-lib/image-manifest.generated.ts";
import { ContentCard } from "../../../components/ContentCard";
import { layout, spacing, typography, useTheme } from "../../../theme";

/**
 * Phase 6C -- Divya Desam index refined: each card now shows an image
 * preview when the record has at least one resolvable image (most do),
 * plus tighter list spacing. Ordering is unchanged from Phase 6B --
 * migration.sourcePageId numeric order, the traditional pilgrimage
 * sequence, never alphabetical.
 */

/** First resolvable image asset for a record, or null -- never a fabricated placeholder. */
function firstImageAsset(record: DivyaDesam): number | null {
  for (const image of record.images) {
    const asset = imagesByUuid[image.sourceAssetUuid.toLowerCase()];
    if (asset !== undefined) return asset;
  }
  return null;
}

export default function DivyaDesamsIndexScreen() {
  const router = useRouter();
  const theme = useTheme();
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
        imageAsset={firstImageAsset(item)}
        onPress={() => router.push(`/divya-desams/${item.slug}` as never)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Divya Desams" }} />
      <Text style={[styles.count, { color: theme.colors.muted }]}>{records.length} records</Text>
      <FlatList data={records} keyExtractor={(item) => item.slug} renderItem={renderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  count: {
    fontSize: typography.small,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
  },
});
