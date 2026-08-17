import { createContext, useContext } from "react";
import type { LanguageCode } from "./content-lib/preferences.ts";

/**
 * Reader-facing content-language context, split from its Provider
 * (LanguageProvider.tsx) the same way ReadingPreferencesContext/
 * ThemeContext already are -- plain function calls with no JSX, so this
 * stays importable under `node --test`.
 */
export interface LanguageContextValue {
  /** null = English, the base language every record always has. */
  language: LanguageCode | null;
  setLanguage: (language: LanguageCode | null) => void;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: null,
  setLanguage: () => {},
});

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
