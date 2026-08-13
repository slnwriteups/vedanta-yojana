import { createContext, useContext } from "react";
import { DEFAULT_READING_PREFERENCES, type ReadingPreferences } from "./content-lib/preferences.ts";

/**
 * Phase 6D -- reading-preferences context, split from its Provider (in
 * ReadingPreferencesProvider.tsx) the same way theme.ts/ThemeProvider.tsx
 * were split in Phase 6C: `createContext`/`useContext` are plain
 * function calls with no JSX, so this stays importable under
 * `node --test` while the one JSX-bearing Provider does not.
 */
export interface ReadingPreferencesContextValue {
  preferences: ReadingPreferences;
  setFontScale: (fontScale: number) => void;
}

export const ReadingPreferencesContext = createContext<ReadingPreferencesContextValue>({
  preferences: DEFAULT_READING_PREFERENCES,
  setFontScale: () => {},
});

export function useReadingPreferences(): ReadingPreferencesContextValue {
  return useContext(ReadingPreferencesContext);
}
