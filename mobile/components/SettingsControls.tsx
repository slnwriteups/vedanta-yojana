import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { layout, radius, spacing, typography, useTheme, useThemeControls, type ColorScheme } from "../theme";
import { useReadingPreferences } from "../preferences-context.ts";
import { useLanguage } from "../language-context.ts";
import { FONT_SCALE_STEPS, SUPPORTED_LANGUAGES, type LanguageCode } from "../content-lib/preferences.ts";

/**
 * The Appearance (theme override), Text size, and Language controls --
 * Appearance/Text size originally inline on the Home tab (Phase 6C/6D),
 * extracted so the exact same UI can be reused by both
 * OnboardingScreen.tsx (shown once, on first launch) and
 * app/(tabs)/settings.tsx (reachable any time after that from its own
 * tab). Language joined them the same way, so the reader's content
 * language is chosen once up front and stays changeable later from the
 * same place -- no behavior change to the existing two: still the same
 * persisted ThemeProvider/ReadingPreferencesProvider/LanguageProvider
 * state.
 */
export function SettingsControls() {
  const { override, setOverride } = useThemeControls();
  const { preferences, setFontScale } = useReadingPreferences();
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.container}>
      <PillGroup label="Language" options={LANGUAGE_OPTIONS} selectedValue={language} onChange={setLanguage} />
      <PillGroup label="Appearance" options={THEME_OPTIONS} selectedValue={override} onChange={setOverride} />
      <PillGroup label="Text size" options={FONT_SCALE_STEPS} selectedValue={preferences.fontScale} onChange={setFontScale} />
    </View>
  );
}

const THEME_OPTIONS: { label: string; value: ColorScheme | null }[] = [
  { label: "System", value: null },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

/** English (value: null, the base language every record always has) plus the translated languages. */
const LANGUAGE_OPTIONS: { label: string; value: LanguageCode | null }[] = [
  { label: "English", value: null },
  ...SUPPORTED_LANGUAGES.map((l) => ({ label: l.nativeLabel, value: l.code })),
];

/**
 * A labeled row of mutually-exclusive pill buttons -- shared by the
 * theme toggle and the font-size control so the two settings look and
 * behave identically rather than duplicating the same markup twice.
 */
function PillGroup<T>({
  label,
  options,
  selectedValue,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  selectedValue: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.pillGroup}>
      <Text style={[styles.pillGroupLabel, { color: theme.colors.muted }]}>{label}</Text>
      <View style={styles.toggleRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = selectedValue === option.value;
          return (
            <Pressable
              key={option.label}
              onPress={() => {
                onChange(option.value);
                AccessibilityInfo.announceForAccessibility(`${label} set to ${option.label}`);
              }}
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
              <Text style={[styles.toggleLabel, { color: selected ? theme.colors.accent : theme.colors.muted }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  pillGroup: {
    gap: spacing.xs,
  },
  pillGroupLabel: {
    fontSize: typography.eyebrow,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: layout.minTouchTarget,
    justifyContent: "center",
  },
  toggleLabel: {
    fontSize: typography.small,
    fontWeight: "600",
  },
});
