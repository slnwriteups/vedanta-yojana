import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";
import { HOME_SECTIONS, type HomeSection } from "../content-lib/navigation.ts";

/**
 * Phase 6B -- the real Home screen, replacing Phase 6A's content-bridge
 * placeholder. Deliberately minimal per the brief: title, one short
 * generic description, and navigation to the four top-level sections.
 * No featured content, daily verse, recommendations, authentication, or
 * user profiles -- none of that is implemented anywhere in this app, so
 * none of it belongs on Home either.
 */
export default function HomeScreen() {
  const router = useRouter();

  function renderSection({ item }: { item: HomeSection }) {
    return (
      <Pressable
        onPress={() => router.push(item.route as never)}
        style={({ pressed }) => [styles.sectionButton, pressed && styles.sectionButtonPressed]}
      >
        <Text style={styles.sectionLabel}>{item.label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vedanta Yojana</Text>
        <Text style={styles.description}>
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
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
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
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sectionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionButtonPressed: {
    backgroundColor: colors.background,
  },
  sectionLabel: {
    fontSize: typography.body,
    fontWeight: "600",
    color: colors.accent,
  },
});
