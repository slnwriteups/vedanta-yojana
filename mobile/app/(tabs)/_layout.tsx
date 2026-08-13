import { Tabs } from "expo-router";
import { useTheme } from "../../theme";

/**
 * Phase 6C -- the bottom tab bar: Home, Divya Desams, Library, Knowledge,
 * Search, exactly the five sections the brief specifies. Text-only labels
 * (no icon library) to keep the dependency set unchanged and to match the
 * restrained, non-decorative character requested for this app -- an
 * icon-less, label-led tab bar reads as calmer and more scholarly than a
 * typical iconography-heavy app tab bar.
 *
 * Single-file tabs (Home, Search) show their own header here directly
 * (headerShown: true) since they have no nested routes. Directory tabs
 * (Divya Desams, Library, Knowledge) hide the Tab-level header
 * (headerShown: false) and instead let their own nested _layout.tsx
 * (a Stack) render per-screen headers -- this is what lets an index ->
 * detail push show a back button and a changing title while the bottom
 * tab bar stays visible the whole time.
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
      <Tabs.Screen name="knowledge" options={{ title: "Knowledge", headerShown: false }} />
      <Tabs.Screen name="search" options={{ title: "Search", headerShown: true }} />
    </Tabs>
  );
}
