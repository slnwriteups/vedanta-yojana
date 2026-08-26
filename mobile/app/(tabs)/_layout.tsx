import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "../../theme";
import { useT } from "../../ui-strings.ts";

/**
 * Renders every tab's label with `adjustsFontSizeToFit` so "Divya Desams"
 * (the longest label, five tabs wide) shrinks just enough to display in
 * full rather than ellipsizing to "Divya Desa..." -- shorter labels
 * (Home, Library, Search, Settings) already fit at the base size, so
 * this only ever kicks in for the one tab that needs it.
 * `minimumFontScale` caps how far it can shrink so the label never goes
 * illegibly small on a narrow device.
 */
function TabLabel({ color, children }: { color: string; children: string }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      style={{ color, fontSize: 11, fontWeight: "500" }}
    >
      {children}
    </Text>
  );
}

/**
 * The bottom tab bar: Home, Divya Desams, Library, Search, Settings.
 * Each tab gets one deliberately-chosen glyph (Divya Desams uses
 * MaterialIcons' "temple-hindu" -- a real gopuram silhouette, and the
 * one glyph across every family @expo/vector-icons 14.1.0 vendors that
 * reflects what this app is actually about, rather than a generic
 * "building" stand-in; MaterialCommunityIcons has no temple glyph in
 * this vendored version, only MaterialIcons does -- checked directly
 * against the package's own glyph maps rather than assumed. The rest
 * use Ionicons' outline/filled pairs so the active tab reads as
 * filled, matching iOS system-app convention). Restrained on purpose
 * -- a single line-weight glyph per tab, tinted by the same
 * accent/muted pair as everything else, not a multi-color icon set --
 * to keep the "scholarly/spiritual, not SaaS" character from theme.ts
 * intact.
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
 *
 * Bug fix: tapping the Library or Divya Desams tab icon while already
 * several screens deep in that tab's own nested Stack (e.g. reading a
 * chapter) did nothing -- React Navigation's bottom-tabs does NOT pop a
 * nested stack to its root on re-tapping the active tab by default,
 * despite that being the platform-conventional behavior (Apple's own
 * apps, e.g. Music/App Store, all pop-to-root on a second tap). Fixed
 * with an explicit `tabPress` listener on each Stack-backed tab below.
 * Two wrong attempts on the way here, both verified empirically rather
 * than assumed: `navigation.popToTop()` (the React Navigation idiom)
 * surfaced an on-screen "action not handled" error, since `navigation`
 * in a Tabs.Screen listener is the TAB navigator's own object and
 * POP_TO_TOP is a stack-only action it doesn't own; `router.navigate`
 * brought the index screen into focus but left older, unrelated stack
 * history reachable via a stray back button, since `navigate` jumps to
 * an existing entry without discarding what's after it.
 * `router.dismissTo`, expo-router's dedicated primitive for exactly
 * this ("go back to this existing screen, discarding everything
 * pushed after it"), is the one that actually gives a clean root
 * screen with no leftover Back button.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const t = useT();

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
        tabBarLabel: ({ color, children }) => <TabLabel color={color}>{children}</TabLabel>,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabHome"),
          headerShown: true,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="divya-desams"
        options={{
          title: t("tabDivyaDesams"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <MaterialIcons name="temple-hindu" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            if (navigation.isFocused()) router.dismissTo("/divya-desams");
          },
        })}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t("tabLibrary"),
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            if (navigation.isFocused()) router.dismissTo("/library");
          },
        })}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("tabSearch"),
          headerShown: true,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabSettings"),
          headerShown: true,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
