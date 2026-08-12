import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../theme";

/**
 * Phase 6A -- root navigation foundation only. Expo Router's file-based
 * routing was chosen specifically because it mirrors the mental model
 * already established by the Next.js reference app's App Router (an
 * app/ directory, file-based routes, a root layout) -- see
 * mobile/README.md for the full justification against React Navigation.
 *
 * No screens are implemented here beyond app/index.tsx's placeholder.
 * Real navigation structure (tabs for Divya Desams/Library/Knowledge/
 * Search, detail screens, etc.) is explicit Phase 6B+ scope.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
