import { Stack } from "expo-router";
import { useTheme } from "../../../theme";

/** Phase 6C -- nested stack so index -> detail keeps the tab bar visible with its own back-button header. */
export default function DivyaDesamsLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.foreground,
        contentStyle: { backgroundColor: theme.colors.background },
        // See app/(tabs)/_layout.tsx's same setting for why: an explicit,
        // solid header rather than trusting the native-stack default.
        headerTransparent: false,
        headerBlurEffect: "none",
      }}
    />
  );
}
