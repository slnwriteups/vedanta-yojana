import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { ThemeContext, resolveTheme, type ColorScheme, type ThemeContextValue } from "./theme";
import { THEME_STORAGE_KEY, isValidThemeOverride } from "./content-lib/preferences.ts";
import { readJSON, writeJSON } from "./storage.ts";

/**
 * Phase 6C -- the only JSX in the theme system, split out of theme.ts so
 * that module stays importable under `node --test` (see theme.ts's own
 * doc comment for why). Defaults to the OS appearance via
 * react-native's useColorScheme().
 *
 * Phase 6D -- the manual override is now persisted (AsyncStorage via
 * storage.ts), loaded once on mount. Until that async read resolves, the
 * system appearance is used -- the same brief first-paint tradeoff
 * ReadingPreferencesProvider makes, not a loading spinner for a settings
 * value.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverrideState] = useState<ColorScheme | null>(null);
  const scheme: ColorScheme = override ?? (systemScheme === "dark" ? "dark" : "light");

  useEffect(() => {
    let cancelled = false;
    readJSON(THEME_STORAGE_KEY, isValidThemeOverride).then((stored) => {
      if (!cancelled && stored !== null) setOverrideState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setOverride(next: ColorScheme | null) {
    setOverrideState(next);
    void writeJSON(THEME_STORAGE_KEY, next);
  }

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: resolveTheme(scheme), override, setOverride }),
    [scheme, override]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
