import { createContext, useContext } from "react";
import type { LastReadPosition } from "./content-lib/preferences.ts";

/**
 * Split from its Provider (ReadingPositionProvider.tsx) the same way
 * LanguageContext/language-context.ts is -- plain function calls with
 * no JSX, so this stays importable under `node --test`.
 */
export interface ReadingPositionContextValue {
  /** null until the persisted read resolves, or if the reader has never opened a chapter. */
  lastRead: LastReadPosition | null;
  recordChapterView: (bookSlug: string, chapterSlug: string) => void;
}

export const ReadingPositionContext = createContext<ReadingPositionContextValue>({
  lastRead: null,
  recordChapterView: () => {},
});

export function useReadingPosition(): ReadingPositionContextValue {
  return useContext(ReadingPositionContext);
}
