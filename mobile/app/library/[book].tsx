import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadBook, loadChapters, type Chapter } from "../../content-lib/loader.ts";
import { ContentCard } from "../../components/ContentCard";
import { DraftBadge } from "../../components/DraftBadge";
import { colors, spacing, typography } from "../../theme";

/**
 * Phase 6B -- the real Book detail screen. loadChapters() already returns
 * chapters sorted ascending by their own `order` field -- the same
 * sequence as the book's chapterOrder -- so no separate re-sort or
 * alphabetical ordering happens here, matching the web app's
 * app/library/[book]/page.tsx exactly.
 */
export default function LibraryBookScreen() {
  const { book: bookSlug } = useLocalSearchParams<{ book: string }>();
  const router = useRouter();
  const book = loadBook(bookSlug);

  if (!book) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.empty}>This book could not be found.</Text>
      </View>
    );
  }

  const chapters = loadChapters(book.slug);

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
    <View style={styles.container}>
      <Stack.Screen options={{ title: book.title }} />
      <View style={styles.header}>
        <DraftBadge status={book.status} needsReview={book.migration.needsReview} />
        <Text style={styles.title}>{book.title}</Text>
        {book.description ? <Text style={styles.description}>{book.description}</Text> : null}
      </View>
      {chapters.length > 0 ? (
        <FlatList data={chapters} keyExtractor={(item) => item.slug} renderItem={renderItem} />
      ) : (
        <Text style={styles.empty}>No chapters are available yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
    color: colors.foreground,
  },
  description: {
    fontSize: typography.body,
    color: colors.muted,
  },
  empty: {
    padding: spacing.lg,
    fontSize: typography.body,
    color: colors.muted,
  },
});
