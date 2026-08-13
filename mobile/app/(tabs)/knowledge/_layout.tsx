import { Stack } from "expo-router";
import { useTheme } from "../../../theme";

/** Phase 6C -- nested stack so index -> detail keeps the tab bar visible with its own back-button header. */
export default function KnowledgeLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.foreground,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
