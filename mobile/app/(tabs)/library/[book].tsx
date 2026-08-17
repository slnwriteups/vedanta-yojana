import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadBook, loadChapters, type Chapter } from "../../../content-lib/loader.ts";
import { ContentCard } from "../../../components/ContentCard";
import { DraftBadge } from "../../../components/DraftBadge";
import { layout, spacing, typography, useTheme } from "../../../theme";
import { localizeBook, localizeChapter } from "../../../../content-lib/i18n.ts";
import { useLanguage } from "../../../language-context.ts";

/**
 * Phase 6C -- unchanged ordering/data behavior from Phase 6B (chapters
 * stay in their own ascending `order`, never re-sorted), theme-aware
 * styling only.
 */
export default function LibraryBookScreen() {
  const { book: bookSlug } = useLocalSearchParams<{ book: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { language } = useLanguage();
  const loadedBook = loadBook(bookSlug);
  const book = loadedBook ? localizeBook(loadedBook, language) : null;

  if (!book) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={[styles.empty, { color: theme.colors.muted }]}>This book could not be found.</Text>
      </View>
    );
  }

  const chapters = loadChapters(book.slug).map((c) => localizeChapter(c, language));

  function renderItem({ item }: { item: Chapter }) {
    return (
      <ContentCard
        title={item.title}
        status={item.status}
        needsReview={item.migration.needsReview}
        onPress={() => router.push(`/library/${book!.slug}/${item.slug}` as never)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: book.title }} />
      <View style={styles.header}>
        <DraftBadge status={book.status} needsReview={book.migration.needsReview} />
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{book.title}</Text>
        {book.description ? (
          <Text style={[styles.description, { color: theme.colors.muted }]}>{book.description}</Text>
        ) : null}
      </View>
      {chapters.length > 0 ? (
        <FlatList
          data={chapters}
          keyExtractor={(item) => item.slug}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={[styles.empty, { color: theme.colors.muted }]}>No chapters are available yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: layout.screenPadding,
    gap: spacing.xs,
  },
  list: {
    paddingBottom: layout.tabBarClearance,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
  },
  description: {
    fontSize: typography.body,
  },
  empty: {
    padding: layout.screenPadding,
    fontSize: typography.body,
  },
});
