import { loadBook, loadChapter } from "./loader.ts";
import { localizeBook, localizeChapter } from "../../content-lib/i18n.ts";
import type { LanguageCode } from "../../content-lib/schemas/index.ts";
import type { LastReadPosition } from "./preferences.ts";

/**
 * Resolves a persisted LastReadPosition (just two slugs -- see
 * preferences.ts) into the real, current, localized titles Home's
 * "Continue Reading" card shows -- looked up fresh via the same
 * loadBook/loadChapter every other screen uses, never cached alongside
 * the position itself, so a later content edit or removed chapter is
 * always reflected correctly. Returns null (not a stale/fabricated
 * title) if either slug no longer resolves to a real record -- Home
 * then falls back to its no-history state, exactly as if nothing had
 * ever been saved.
 */
export interface ResolvedLastRead {
  bookSlug: string;
  chapterSlug: string;
  bookTitle: string;
  chapterTitle: string;
}

export function resolveLastRead(
  position: LastReadPosition | null,
  language: LanguageCode | null
): ResolvedLastRead | null {
  if (!position) return null;
  const book = loadBook(position.bookSlug);
  const chapter = loadChapter(position.bookSlug, position.chapterSlug);
  if (!book || !chapter) return null;
  return {
    bookSlug: position.bookSlug,
    chapterSlug: position.chapterSlug,
    bookTitle: localizeBook(book, language).title,
    chapterTitle: localizeChapter(chapter, language).title,
  };
}
