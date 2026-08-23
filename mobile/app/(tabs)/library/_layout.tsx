import { Stack } from "expo-router";
import { useTheme } from "../../../theme";
import { ScreenHeader } from "../../../components/ScreenHeader";

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
 *
 * `header: ScreenHeader` -- reported directly on-device: the native
 * header was overlapping the status bar under a dense notification
 * icon row. See ScreenHeader.tsx for the full reasoning; this replaces
 * only the header's rendering, not gestureEnabled/contentStyle above.
 */
export default function LibraryLayout() {
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
