import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { buildMobileSearchCorpus } from "../../content-lib/corpus.ts";
import { searchCorpus } from "../../../content-lib/search/run.ts";
import type { SearchResult } from "../../../content-lib/search/types.ts";
import { layout, radius, spacing, typography, useTheme } from "../../theme";

/**
 * Phase 6C -- theme-aware styling and accessibility labels only; the
 * offline search behavior is unchanged from Phase 6B (same in-memory
 * corpus, same pure ranking pipeline, no network). This file is a
 * single-file tab (no nested Stack), so its header title now comes from
 * app/(tabs)/_layout.tsx's Tabs.Screen options rather than an inline
 * <Stack.Screen> (which would have no Stack ancestor to attach to here).
 */
export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const corpus = useMemo(() => buildMobileSearchCorpus(), []);
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const results = useMemo(
    () => (trimmedQuery ? searchCorpus(corpus, trimmedQuery) : []),
    [corpus, trimmedQuery]
  );

  function renderItem({ item }: { item: SearchResult }) {
    return (
      <View style={[styles.result, { borderBottomColor: theme.colors.border }]}>
        <Text
          style={[styles.resultTitle, { color: theme.colors.accent }]}
          onPress={() => router.push(item.href as never)}
          accessibilityRole="link"
          accessibilityLabel={`${item.title}, ${item.type}${item.parentTitle ? `, in ${item.parentTitle}` : ""}`}
        >
          {item.title}
        </Text>
        <Text style={[styles.resultMeta, { color: theme.colors.muted }]}>
          {item.type}
          {item.parentTitle ? ` · ${item.parentTitle}` : ""}
        </Text>
        {item.excerpt ? (
          <Text style={[styles.excerpt, { color: theme.colors.foreground }]}>{item.excerpt}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search Divya Desams, Library, Knowledge"
        placeholderTextColor={theme.colors.muted}
        accessibilityLabel="Search"
        accessibilityHint="Searches Divya Desams, the Library, and Knowledge records"
        style={[
          styles.input,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.foreground },
        ]}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {trimmedQuery && results.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.muted }]}>No results for "{trimmedQuery}".</Text>
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
  },
  input: {
    margin: layout.screenPadding,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: typography.body,
    minHeight: layout.minTouchTarget,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  result: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultTitle: {
    fontSize: typography.body,
    fontWeight: "600",
  },
  resultMeta: {
    fontSize: typography.eyebrow,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  excerpt: {
    fontSize: typography.small,
  },
  empty: {
    padding: layout.screenPadding,
    fontSize: typography.body,
  },
});
