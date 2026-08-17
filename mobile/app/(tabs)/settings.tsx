import { ScrollView, StyleSheet } from "react-native";
import { SettingsControls } from "../../components/SettingsControls";
import { layout, spacing, useTheme } from "../../theme";

/**
 * A bottom tab, alongside Home/Divya Desams/Library/Search (see
 * app/(tabs)/_layout.tsx). Same SettingsControls the one-time
 * OnboardingScreen shows on first launch -- this is just the
 * always-available place to come back and change them later. A
 * single-file tab (no nested Stack), so its header title comes from
 * the Tabs.Screen options in _layout.tsx, same as search.tsx.
 */
export default function SettingsScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <SettingsControls />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: layout.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: layout.tabBarClearance,
  },
});
