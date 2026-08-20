import { Stack } from "expo-router";
import { useTheme } from "../../../theme";

/**
 * Phase 6C -- nested stack so index -> book -> chapter keeps the tab
 * bar visible with its own back-button header.
 *
 * `gestureEnabled: true` -- native-stack's own default, made explicit
 * so the intent (swipe from the left edge on a chapter goes back to
 * that book's own chapter list -- one pop, since chapter is pushed
 * directly on book -- and from the chapter list back to the Library
 * index, same gesture) is documented in code rather than left as an
 * implicit default a future change could silently break.
 */
export default function LibraryLayout() {
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
        gestureEnabled: true,
      }}
    />
  );
}
