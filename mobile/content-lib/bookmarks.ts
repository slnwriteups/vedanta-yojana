import { loadBook, loadChapter } from "./loader.ts";
import { localizeBook, localizeChapter } from "../../content-lib/i18n.ts";
import type { LanguageCode } from "../../content-lib/schemas/index.ts";
import type { BookmarkEntry } from "./preferences.ts";

/**
 * Resolves persisted BookmarkEntry records into the real, current,
 * localized titles Home's "Bookmarks" section shows -- same reasoning
 * as reading-position.ts's resolveLastRead: looked up fresh via the
 * same loadBook/loadChapter every other screen uses, never cached
 * alongside the bookmark itself, so a later content edit is always
 * reflected. A bookmark whose chapter/book no longer resolves is
 * silently dropped (not shown as a broken row) rather than surfaced
 * as an error -- content can be renamed/removed independently of a
 * reader's saved list.
 */
export interface ResolvedBookmark {
  bookSlug: string;
  chapterSlug: string;
  bookTitle: string;
  chapterTitle: string;
  savedAt: number;
}

export function resolveBookmarks(entries: BookmarkEntry[], language: LanguageCode | null): ResolvedBookmark[] {
  const resolved: ResolvedBookmark[] = [];
  for (const entry of entries) {
    const book = loadBook(entry.bookSlug);
    const chapter = loadChapter(entry.bookSlug, entry.chapterSlug);
    if (!book || !chapter) continue;
    resolved.push({
      bookSlug: entry.bookSlug,
      chapterSlug: entry.chapterSlug,
      bookTitle: localizeBook(book, language).title,
      chapterTitle: localizeChapter(chapter, language).title,
      savedAt: entry.savedAt,
    });
  }
  return resolved.sort((a, b) => b.savedAt - a.savedAt);
}
