import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../theme";

/**
 * Phase 6A -- root navigation foundation. Expo Router's file-based
 * routing was chosen specifically because it mirrors the mental model
 * already established by the Next.js reference app's App Router (an
 * app/ directory, file-based routes, a root layout) -- see
 * mobile/README.md for the full justification against React Navigation.
 *
 * Phase 6B: every screen sets its own title via an inline
 * `<Stack.Screen options={{ title }} />` (the standard Expo Router
 * pattern), so this layout only needs to name the Home route here.
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
      >
        <Stack.Screen name="index" options={{ title: "Vedanta Yojana" }} />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
