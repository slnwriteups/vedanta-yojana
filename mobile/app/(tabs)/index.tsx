import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { HOME_SECTIONS, type HomeSection } from "../../content-lib/navigation.ts";
import { layout, radius, spacing, typography, useTheme, useThemeControls, type ColorScheme } from "../../theme";
import { shadows } from "../../shadows";

/**
 * Phase 6C -- Home refined: a calmer hero (title + one short generic
 * description, no imagery, no "featured" anything), a theme toggle (the
 * one user-facing control for the Phase 6C dark-mode foundation), and
 * four navigation cards each with a one-line generic description (the
 * same static copy the web app's own section index pages use -- see
 * content-lib/navigation.ts). Still React Native primitives only:
 * View/Text/Pressable/FlatList, per the brief.
 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { override, setOverride } = useThemeControls();

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
        <ThemeToggle override={override} onChange={setOverride} />
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

const THEME_OPTIONS: { label: string; value: ColorScheme | null }[] = [
  { label: "System", value: null },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

/** The one Phase 6C dark-mode control: a session-only override (no persistence, per the brief's explicit scope). */
function ThemeToggle({
  override,
  onChange,
}: {
  override: ColorScheme | null;
  onChange: (value: ColorScheme | null) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggleRow} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
      {THEME_OPTIONS.map((option) => {
        const selected = override === option.value;
        return (
          <Pressable
            key={option.label}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={[
              styles.toggleButton,
              {
                borderColor: selected ? theme.colors.accent : theme.colors.border,
                backgroundColor: selected ? theme.colors.surfaceAlt : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.toggleLabel,
                { color: selected ? theme.colors.accent : theme.colors.muted },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
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
  toggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 32,
    justifyContent: "center",
  },
  toggleLabel: {
    fontSize: typography.small,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
    paddingBottom: spacing.xl,
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
