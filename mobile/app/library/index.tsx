import { Stack, useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadBooks, loadChapters, type Book } from "../../content-lib/loader.ts";
import { ContentCard } from "../../components/ContentCard";
import { colors, spacing, typography } from "../../theme";

/**
 * Phase 6B -- the real Library index. Every book comes from loadBooks();
 * none is hard-coded. Today there is exactly one recovered book, listed
 * because the loader returned it, not because its title is written here.
 */
export default function LibraryIndexScreen() {
  const router = useRouter();
  const books = loadBooks();

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
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Library" }} />
      {books.length > 0 ? (
        <FlatList data={books} keyExtractor={(item) => item.slug} renderItem={renderItem} />
      ) : (
        <Text style={styles.empty}>No books are available yet.</Text>
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
