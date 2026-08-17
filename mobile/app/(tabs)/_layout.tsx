import { Tabs } from "expo-router";
import { useTheme } from "../../theme";

/**
 * The bottom tab bar: Home, Divya Desams, Library, Search, Settings.
 * Text-only labels (no icon library) to keep the dependency set
 * unchanged and to match the restrained, non-decorative character
 * requested for this app -- an icon-less, label-led tab bar reads as
 * calmer and more scholarly than a typical iconography-heavy app tab
 * bar.
 *
 * The former Knowledge tab was retired: its one real record, the
 * "introduction" article, was moved to live under the Divya Desams tab
 * instead (app/(tabs)/divya-desams/introduction.tsx), since its own
 * content explicitly serves that section rather than a general-purpose
 * category -- mirroring the same move on the web.
 *
 * Single-file tabs (Home, Search, Settings) show their own header here
 * directly (headerShown: true) since they have no nested routes.
 * Directory tabs (Divya Desams, Library) hide the Tab-level header
 * (headerShown: false) and instead let their own nested _layout.tsx (a
 * Stack) render per-screen headers -- this is what lets an index ->
 * detail push show a back button and a changing title while the bottom
 * tab bar stays visible the whole time.
 *
 * Settings (Appearance/Text-size, same controls OnboardingScreen.tsx
 * shows once on first launch) is its own always-available tab, placed
 * last -- not a header button, not a modal.
 */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        // tabBarStyle.backgroundColor (an opaque theme color, unchanged)
        // already gives the tab bar a solid background.
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.foreground,
        // Explicit, not relying on the default: reported as scrollable
        // content showing through the header with no solid backing --
        // iOS's native header can apply its own translucency absent an
        // explicit opt-out. (bottom-tabs' own header option set has no
        // separate blur-effect control the way native-stack's does --
        // see the nested Stack layouts, divya-desams/_layout.tsx and
        // library/_layout.tsx, for that.)
        headerTransparent: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerShown: true }} />
      <Tabs.Screen name="divya-desams" options={{ title: "Divya Desams", headerShown: false }} />
      <Tabs.Screen name="library" options={{ title: "Library", headerShown: false }} />
      <Tabs.Screen name="search" options={{ title: "Search", headerShown: true }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", headerShown: true }} />
    </Tabs>
  );
}
