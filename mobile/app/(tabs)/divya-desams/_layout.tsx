import { Stack } from "expo-router";
import { useTheme } from "../../../theme";
import { ScreenHeader } from "../../../components/ScreenHeader";

/**
 * Phase 6C -- nested stack so index -> detail keeps the tab bar visible
 * with its own back-button header.
 *
 * `gestureEnabled: true` -- native-stack's own default, made explicit
 * so the intent (swipe from the left edge on a detail screen goes back
 * to the Divya Desams list, iOS's standard interactive-pop gesture) is
 * documented in code rather than left as an implicit default that a
 * future change could silently break.
 *
 * `header: ScreenHeader` -- see library/_layout.tsx's identical change
 * and components/ScreenHeader.tsx for why: the native header overlapped
 * the status bar under a dense notification icon row, reported directly
 * on-device.
 */
export default function DivyaDesamsLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        header: (props) => <ScreenHeader {...props} />,
        contentStyle: { backgroundColor: theme.colors.background },
        gestureEnabled: true,
      }}
    />
  );
}
