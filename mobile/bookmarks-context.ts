import { createContext, useContext } from "react";
import type { BookmarkEntry } from "./content-lib/preferences.ts";

/**
 * Split from its Provider (BookmarksProvider.tsx) the same way
 * ReadingPositionProvider.tsx/reading-position-context.ts is -- plain
 * function calls with no JSX, so this stays importable under `node --test`.
 */
export interface BookmarksContextValue {
  bookmarks: BookmarkEntry[];
  isBookmarked: (bookSlug: string, chapterSlug: string) => boolean;
  toggleBookmark: (bookSlug: string, chapterSlug: string) => void;
}

export const BookmarksContext = createContext<BookmarksContextValue>({
  bookmarks: [],
  isBookmarked: () => false,
  toggleBookmark: () => {},
});

export function useBookmarks(): BookmarksContextValue {
  return useContext(BookmarksContext);
}
