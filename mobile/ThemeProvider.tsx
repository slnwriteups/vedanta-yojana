import { useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { ThemeContext, resolveTheme, type ColorScheme, type ThemeContextValue } from "./theme";

/**
 * Phase 6C -- the only JSX in the theme system, split out of theme.ts so
 * that module stays importable under `node --test` (see theme.ts's own
 * doc comment for why). Defaults to the OS appearance via
 * react-native's useColorScheme(); a manual override is session-only
 * state, no persistence, per the Phase 6C brief's explicit scope.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);
  const scheme: ColorScheme = override ?? (systemScheme === "dark" ? "dark" : "light");

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: resolveTheme(scheme), override, setOverride }),
    [scheme, override]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
