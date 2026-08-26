import { Stack, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadBooks, loadChapters, type Book } from "../../../content-lib/loader.ts";
import { ContentCard } from "../../../components/ContentCard";
import { layout, spacing, typography, useTheme } from "../../../theme";
import { sectionTint } from "../../../section-tints.ts";
import { bookCoverAsset } from "../../../book-covers.ts";
import { localizeBook } from "../../../../content-lib/i18n.ts";
import { useLanguage } from "../../../language-context.ts";
import { chapterCountLabel, useT } from "../../../ui-strings.ts";

/**
 * Phase 6C -- unchanged data behavior from Phase 6B, theme-aware
 * styling only.
 *
 * UI/UX pass: each book gets its own section-tints.ts color as a
 * matching card-edge stripe -- since a book's chapter list
 * ([book].tsx) carries the same tint through, the color becomes a
 * consistent visual thread from the Library index into that book's
 * own chapters. Books with real cover art (book-covers.ts) show it;
 * the remaining monogram swatch is only a fallback for a book with no
 * cover on file, never invented.
 */
export default function LibraryIndexScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { language } = useLanguage();
  const t = useT();
  const books = loadBooks().map((b) => localizeBook(b, language));

  function renderItem({ item }: { item: Book }) {
    const chapterCount = loadChapters(item.slug).length;
    const tint = sectionTint(item.slug, theme.scheme);
    return (
      <ContentCard
        title={item.title}
        subtitle={chapterCountLabel(language, chapterCount)}
        status={item.status}
        needsReview={item.migration.needsReview}
        tintColor={tint}
        imageAsset={bookCoverAsset(item.slug)}
        monogram={item.title.trim().charAt(0).toUpperCase()}
        variant="cover"
        onPress={() => router.push(`/library/${item.slug}` as never)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: t("tabLibrary") }} />
      {books.length > 0 ? (
        <FlatList
          data={books}
          keyExtractor={(item) => item.slug}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={[styles.empty, { color: theme.colors.muted }]}>{t("noBooksYet")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    paddingTop: spacing.md,
    paddingBottom: layout.tabBarClearance,
  },
  empty: {
    padding: layout.screenPadding,
    fontSize: typography.body,
  },
});
