import { loadBook, loadChapter, loadChapters } from "./loader.ts";
import { localizeBook, localizeChapter } from "../../content-lib/i18n.ts";
import { estimateReadingMinutes } from "../../content-lib/text-format.ts";
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
  /** This chapter's 1-indexed position in the book's own chapterOrder. */
  chapterPosition: number;
  /** Total chapters in the book -- together with chapterPosition, Home's "Chapter N of Total". */
  totalChapters: number;
  /** estimateReadingMinutes() of this chapter's own (localized) body -- "time left" in the current chapter, not the whole book. */
  minutesLeft: number;
}

export function resolveLastRead(
  position: LastReadPosition | null,
  language: LanguageCode | null
): ResolvedLastRead | null {
  if (!position) return null;
  const book = loadBook(position.bookSlug);
  const chapter = loadChapter(position.bookSlug, position.chapterSlug);
  if (!book || !chapter) return null;
  const chapters = loadChapters(position.bookSlug);
  const chapterPosition = chapters.findIndex((c) => c.slug === chapter.slug) + 1;
  const localizedChapter = localizeChapter(chapter, language);
  return {
    bookSlug: position.bookSlug,
    chapterSlug: position.chapterSlug,
    bookTitle: localizeBook(book, language).title,
    chapterTitle: localizedChapter.title,
    chapterPosition,
    totalChapters: chapters.length,
    minutesLeft: estimateReadingMinutes(localizedChapter.body),
  };
}

/**
 * Resolves an entire lastReadByBook list (one entry per book with a
 * saved position -- see ReadingPositionProvider.tsx) into real, current,
 * localized cards -- one per book that still resolves, most-recently-
 * read first. Reuses resolveLastRead() per entry rather than
 * duplicating its resolution/null-handling logic; a book whose saved
 * chapter no longer resolves is silently dropped, exactly like the
 * single-position case.
 */
export function resolveAllLastRead(
  positions: LastReadPosition[],
  language: LanguageCode | null
): ResolvedLastRead[] {
  return positions
    .map((position) => ({ savedAt: position.savedAt, resolved: resolveLastRead(position, language) }))
    .filter((entry): entry is { savedAt: number; resolved: ResolvedLastRead } => entry.resolved !== null)
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((entry) => entry.resolved);
}
