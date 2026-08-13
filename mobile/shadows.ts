import { Platform } from "react-native";

/**
 * Phase 6C -- split out of theme.ts because `react-native`'s own source
 * cannot be imported under plain Node (verified empirically: it throws a
 * syntax error under `node --test`, which has no Metro/Babel transform
 * pipeline). Only ever imported by actual screen/component files, never
 * by a test file. iOS uses shadowColor/Offset/Opacity/Radius; Android has
 * no equivalent and uses `elevation` instead.
 */
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;
