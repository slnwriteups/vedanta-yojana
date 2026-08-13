import { Tabs } from "expo-router";
import { useTheme } from "../../theme";

/**
 * The bottom tab bar: Home, Divya Desams, Library, Search. Text-only
 * labels (no icon library) to keep the dependency set unchanged and to
 * match the restrained, non-decorative character requested for this app
 * -- an icon-less, label-led tab bar reads as calmer and more scholarly
 * than a typical iconography-heavy app tab bar.
 *
 * The former Knowledge tab was retired: its one real record, the
 * "introduction" article, was moved to live under the Divya Desams tab
 * instead (app/(tabs)/divya-desams/introduction.tsx), since its own
 * content explicitly serves that section rather than a general-purpose
 * category -- mirroring the same move on the web.
 *
 * Single-file tabs (Home, Search) show their own header here directly
 * (headerShown: true) since they have no nested routes. Directory tabs
 * (Divya Desams, Library) hide the Tab-level header (headerShown: false)
 * and instead let their own nested _layout.tsx (a Stack) render
 * per-screen headers -- this is what lets an index -> detail push show a
 * back button and a changing title while the bottom tab bar stays
 * visible the whole time.
 */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.foreground,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerShown: true }} />
      <Tabs.Screen name="divya-desams" options={{ title: "Divya Desams", headerShown: false }} />
      <Tabs.Screen name="library" options={{ title: "Library", headerShown: false }} />
      <Tabs.Screen name="search" options={{ title: "Search", headerShown: true }} />
    </Tabs>
  );
}
