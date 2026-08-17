import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { HOME_SECTIONS, type HomeSection } from "../../content-lib/navigation.ts";
import { layout, radius, spacing, typography, useTheme } from "../../theme";
import { shadows } from "../../shadows";

/**
 * Phase 6C -- Home refined: a calmer hero (title + one short generic
 * description, no imagery, no "featured" anything) and four navigation
 * cards each with a one-line generic description (the same static copy
 * the web app's own section index pages use -- see
 * content-lib/navigation.ts). Still React Native primitives only.
 *
 * The Appearance/Text-size controls that used to live inline here
 * (Phase 6D) moved out: a one-time choice now happens in
 * OnboardingScreen.tsx right after the restored welcome screen, and the
 * same controls stay reachable afterward from the Settings tab (see
 * app/(tabs)/_layout.tsx and app/(tabs)/settings.tsx) -- Home itself
 * goes back to being just the section list, uncluttered on every visit.
 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  function renderSection({ item }: { item: HomeSection }) {
    return (
      <Pressable
        onPress={() => router.push(item.route as never)}
        accessibilityRole="button"
        accessibilityLabel={`${item.label}. ${item.description}`}
        style={({ pressed }) => [
          styles.card,
          shadows.card,
          {
            borderColor: theme.colors.border,
            backgroundColor: pressed ? theme.colors.background : theme.colors.surface,
          },
        ]}
      >
        <Text style={[styles.cardLabel, { color: theme.colors.accent }]}>{item.label}</Text>
        <Text style={[styles.cardDescription, { color: theme.colors.muted }]}>{item.description}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>Vedanta Yojana</Text>
        <Text style={[styles.description, { color: theme.colors.muted }]}>
          A reference for Divya Desams, the Library, and supporting Knowledge material.
        </Text>
      </View>

      <FlatList
        data={HOME_SECTIONS}
        keyExtractor={(item) => item.route}
        renderItem={renderSection}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.title + 4,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  description: {
    fontSize: typography.body,
    lineHeight: typography.body * typography.readingLineHeight,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
    paddingBottom: layout.tabBarClearance,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  cardLabel: {
    fontSize: typography.heading,
    fontWeight: "700",
  },
  cardDescription: {
    fontSize: typography.small,
  },
});
