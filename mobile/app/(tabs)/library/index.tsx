import { Stack, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadBooks, loadChapters, type Book } from "../../../content-lib/loader.ts";
import { ContentCard } from "../../../components/ContentCard";
import { layout, typography, useTheme } from "../../../theme";
import { localizeBook } from "../../../../content-lib/i18n.ts";
import { useLanguage } from "../../../language-context.ts";

/** Phase 6C -- unchanged data behavior from Phase 6B, theme-aware styling only. */
export default function LibraryIndexScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { language } = useLanguage();
  const books = loadBooks().map((b) => localizeBook(b, language));

  function renderItem({ item }: { item: Book }) {
    const chapterCount = loadChapters(item.slug).length;
    return (
      <ContentCard
        title={item.title}
        subtitle={`${chapterCount} chapter${chapterCount === 1 ? "" : "s"}`}
        status={item.status}
        needsReview={item.migration.needsReview}
        onPress={() => router.push(`/library/${item.slug}` as never)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Library" }} />
      {books.length > 0 ? (
        <FlatList
          data={books}
          keyExtractor={(item) => item.slug}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={[styles.empty, { color: theme.colors.muted }]}>No books are available yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    paddingBottom: layout.tabBarClearance,
  },
  empty: {
    padding: layout.screenPadding,
    fontSize: typography.body,
  },
});
