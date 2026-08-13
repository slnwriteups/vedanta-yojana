import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { ThemeProvider } from "../ThemeProvider";
import { ReadingPreferencesProvider } from "../ReadingPreferencesProvider";

/**
 * Phase 6C -- the root layout hosts the ThemeProvider and a single Stack
 * screen for the "(tabs)" group; the actual navigation chrome (bottom
 * tabs, per-tab nested stacks) lives in app/(tabs)/_layout.tsx and each
 * tab's own _layout.tsx. `(tabs)` is an Expo Router GROUP directory --
 * its name in parentheses never appears in the URL, so every route from
 * Phase 6B (`/`, `/divya-desams`, `/divya-desams/[slug]`, `/library`,
 * `/library/[book]`, `/library/[book]/[chapter]`, `/search`) is unchanged
 * and every existing deep link still resolves. The former `/knowledge`
 * and `/knowledge/[slug]` routes were retired; the one real Knowledge
 * record now lives at the static `/divya-desams/introduction` route,
 * co-located with `/divya-desams/[slug]`.
 *
 * Phase 6D adds ReadingPreferencesProvider alongside ThemeProvider --
 * the two persisted-preference providers, both loading from AsyncStorage
 * once on mount (see ThemeProvider.tsx / ReadingPreferencesProvider.tsx).
 */
function RootStack() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ReadingPreferencesProvider>
        <SafeAreaProvider>
          <RootStack />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </ReadingPreferencesProvider>
    </ThemeProvider>
  );
}
