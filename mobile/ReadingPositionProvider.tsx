import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LAST_READ_STORAGE_KEY, isValidLastReadPosition, type LastReadPosition } from "./content-lib/preferences.ts";
import { ReadingPositionContext, type ReadingPositionContextValue } from "./reading-position-context.ts";
import { readJSON, writeJSON } from "./storage.ts";

/**
 * Same shape as LanguageProvider.tsx: loads the persisted last-read
 * position once on mount, persists every update. recordChapterView is
 * called from the chapter screen itself (library/[book]/[chapter].tsx)
 * on every view -- last write wins, so re-opening an earlier chapter
 * after a later one correctly moves "Continue Reading" back to it,
 * matching what a reader would actually expect "where I left off" to
 * mean.
 */
export function ReadingPositionProvider({ children }: { children: ReactNode }) {
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);

  useEffect(() => {
    let cancelled = false;
    readJSON(LAST_READ_STORAGE_KEY, isValidLastReadPosition).then((stored) => {
      if (!cancelled && stored !== null) setLastRead(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<ReadingPositionContextValue>(
    () => ({
      lastRead,
      recordChapterView: (bookSlug: string, chapterSlug: string) => {
        const next: LastReadPosition = { bookSlug, chapterSlug, savedAt: Date.now() };
        setLastRead(next);
        void writeJSON(LAST_READ_STORAGE_KEY, next);
      },
    }),
    [lastRead]
  );

  return <ReadingPositionContext.Provider value={value}>{children}</ReadingPositionContext.Provider>;
}
