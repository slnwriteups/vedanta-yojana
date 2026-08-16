import type { ColorScheme } from "../theme.ts";

/**
 * Phase 6D -- the pure, storage-agnostic half of the settings foundation:
 * key names, defaults, and validation for values that came back from
 * disk (AsyncStorage returns untyped JSON -- a corrupted or
 * previous-shape value must never crash the app or be trusted blindly).
 * Deliberately has NO AsyncStorage import, so it stays importable under
 * `node --test` -- see mobile/storage.ts for the one file that actually
 * touches AsyncStorage, and README-documented reasoning in theme.ts/
 * ThemeProvider.tsx for why this split matters (react-native and its
 * native-module packages cannot be imported under plain Node at all).
 */

export const THEME_STORAGE_KEY = "vy.preferences.themeOverride";
export const READING_STORAGE_KEY = "vy.preferences.reading";
/** Whether the restored launch welcome screen has ever been shown -- see WelcomeScreen.tsx. */
export const WELCOME_SEEN_STORAGE_KEY = "vy.preferences.welcomeSeen";

export function isValidThemeOverride(value: unknown): value is ColorScheme | null {
  return value === null || value === "light" || value === "dark";
}

export function isValidSeenFlag(value: unknown): value is true {
  return value === true;
}

export interface ReadingPreferences {
  /** Multiplier applied to typography.body for long-form paragraphs. */
  fontScale: number;
}

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = { fontScale: 1 };

/** The only font scale steps the UI offers -- Small/Medium/Large/Extra Large. */
export const FONT_SCALE_STEPS: { label: string; value: number }[] = [
  { label: "Small", value: 0.9 },
  { label: "Medium", value: 1 },
  { label: "Large", value: 1.15 },
  { label: "Extra Large", value: 1.3 },
];

const VALID_FONT_SCALES = new Set(FONT_SCALE_STEPS.map((step) => step.value));

export function isValidReadingPreferences(value: unknown): value is ReadingPreferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.fontScale === "number" && VALID_FONT_SCALES.has(candidate.fontScale);
}
