import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { ThemeProvider } from "../ThemeProvider";
import { ReadingPreferencesProvider } from "../ReadingPreferencesProvider";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { WELCOME_SEEN_STORAGE_KEY, isValidSeenFlag } from "../content-lib/preferences.ts";
import { readJSON, writeJSON } from "../storage.ts";

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
 *
 * A third persisted flag (WELCOME_SEEN_STORAGE_KEY) gates the restored
 * legacy launch screen (WelcomeScreen.tsx, mirroring web's
 * components/WelcomeGate.tsx): until that AsyncStorage read resolves,
 * nothing but a plain themed background renders -- unlike the theme/
 * reading-preference reads, this one MUST block first paint, since
 * showing (tabs) even briefly before a first-ever launch's welcome
 * screen would defeat the point of restoring it.
 */
function RootStack() {
  const theme = useTheme();
  const [seenWelcome, setSeenWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    readJSON(WELCOME_SEEN_STORAGE_KEY, isValidSeenFlag).then((stored) => {
      if (!cancelled) setSeenWelcome(stored === true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (seenWelcome === null) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  if (!seenWelcome) {
    return (
      <WelcomeScreen
        onDone={() => {
          setSeenWelcome(true);
          void writeJSON(WELCOME_SEEN_STORAGE_KEY, true);
        }}
      />
    );
  }

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
