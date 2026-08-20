import { Stack, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadDivyaDesams, loadKnowledgeRecord, type DivyaDesam } from "../../../content-lib/loader.ts";
import { sourcePageNumber } from "../../../content-lib/ordering.ts";
import { imagesByUuid } from "../../../content-lib/image-manifest.generated.ts";
import { ContentCard } from "../../../components/ContentCard";
import { layout, spacing, typography, useTheme } from "../../../theme";
import { sectionTint } from "../../../section-tints.ts";
import { localizeDivyaDesam, localizeKnowledge } from "../../../../content-lib/i18n.ts";
import { useLanguage } from "../../../language-context.ts";

/**
 * Phase 6C -- Divya Desam index refined: each card now shows an image
 * preview when the record has at least one resolvable image (most do),
 * plus tighter list spacing. Ordering is unchanged from Phase 6B --
 * migration.sourcePageId numeric order, the traditional pilgrimage
 * sequence, never alphabetical.
 *
 * UI/UX pass: every row carries the same "divya-desams" section tint
 * (section-tints.ts) as its card-edge stripe -- unlike Library's
 * per-book tints, this one color is shared across all 107 records
 * plus the introduction card, reinforcing "you're in this section" as
 * a section-wide identity rather than distinguishing them from each
 * other (their own photos already do that).
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
  const { language } = useLanguage();
  const records = [...loadDivyaDesams()]
    .sort((a, b) => sourcePageNumber(a.migration.sourcePageId) - sourcePageNumber(b.migration.sourcePageId))
    .map((r) => localizeDivyaDesam(r, language));
  const loadedIntroduction = loadKnowledgeRecord("introduction");
  const introduction = loadedIntroduction ? localizeKnowledge(loadedIntroduction, language) : null;
  const tint = sectionTint("divya-desams", theme.scheme);

  function renderItem({ item }: { item: DivyaDesam }) {
    return (
      <ContentCard
        title={item.displayName}
        subtitle={item.templeInformation.moolavar}
        status={item.status}
        needsReview={item.migration.needsReview}
        imageAsset={firstImageAsset(item)}
        tintColor={tint}
        onPress={() => router.push(`/divya-desams/${item.slug}` as never)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Divya Desams" }} />
      <Text style={[styles.count, { color: theme.colors.muted }]}>{records.length} records</Text>
      <FlatList
        data={records}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          introduction ? (
            <ContentCard
              title={introduction.title}
              subtitle="Start here before exploring the temples below."
              tintColor={tint}
              onPress={() => router.push("/divya-desams/introduction" as never)}
            />
          ) : null
        }
      />
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
  list: {
    paddingBottom: layout.tabBarClearance,
  },
});
