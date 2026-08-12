import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { buildMobileSearchCorpus } from "../content-lib/corpus.ts";
import { searchCorpus } from "../../content-lib/search/run.ts";
import type { SearchResult } from "../../content-lib/search/types.ts";
import { colors, radius, spacing, typography } from "../theme";

/**
 * Phase 6B -- fully offline search: the corpus is built once from the
 * mobile content loader (no network, no Firebase/Algolia, no backend),
 * and every keystroke re-ranks it in memory via the exact same pure
 * ranking pipeline (searchContent/rankSearchResults/createExcerpt,
 * reached through from content-lib/search/) the web app uses. `href`
 * values on each SearchResult are already shaped as this app's own
 * Expo Router paths (e.g. "/divya-desams/sri-rangam"), so navigation is
 * a direct router.push with no URL translation needed.
 */
export default function SearchScreen() {
  const router = useRouter();
  const corpus = useMemo(() => buildMobileSearchCorpus(), []);
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const results = useMemo(
    () => (trimmedQuery ? searchCorpus(corpus, trimmedQuery) : []),
    [corpus, trimmedQuery]
  );

  function renderItem({ item }: { item: SearchResult }) {
    return (
      <View style={styles.result}>
        <Text
          style={styles.resultTitle}
          onPress={() => router.push(item.href as never)}
        >
          {item.title}
        </Text>
        <Text style={styles.resultMeta}>
          {item.type}
          {item.parentTitle ? ` · ${item.parentTitle}` : ""}
        </Text>
        {item.excerpt ? <Text style={styles.excerpt}>{item.excerpt}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Search" }} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search Divya Desams, Library, Knowledge"
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {trimmedQuery && results.length === 0 ? (
        <Text style={styles.empty}>No results for "{trimmedQuery}".</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.href}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  input: {
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: typography.body,
    color: colors.foreground,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  result: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultTitle: {
    fontSize: typography.body,
    fontWeight: "600",
    color: colors.accent,
  },
  resultMeta: {
    fontSize: typography.eyebrow,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  excerpt: {
    fontSize: typography.small,
    color: colors.foreground,
  },
  empty: {
    padding: spacing.lg,
    fontSize: typography.body,
    color: colors.muted,
  },
});
