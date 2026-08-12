import type { ZodSafeParseResult, ZodError } from "zod";
import {
  BookSchema,
  ChapterSchema,
  DivyaDesamSchema,
  KnowledgeSchema,
  type Book,
  type Chapter,
  type DivyaDesam,
  type Knowledge,
} from "../../content-lib/schemas/index.ts";
import { ContentValidationError, DuplicateChapterOrderError, DuplicateSlugError } from "../../content-lib/loader/errors.ts";
import { rawBookGroups, rawDivyaDesams, rawKnowledge } from "./manifest.generated.ts";

/**
 * Phase 6A -- the mobile-compatible content access layer. Same public
 * API shape as the web loader (content-lib/loader/index.ts:
 * loadDivyaDesams/loadDivyaDesam/loadBooks/loadBook/loadChapters/
 * loadChapter/loadKnowledge/loadKnowledgeRecord), same validation
 * (every record parses through the identical Zod schemas -- reused
 * directly, not reimplemented), same not-found convention (null for a
 * single lookup, [] for an empty collection), same duplicate-slug /
 * duplicate-chapter-order detection (the exact error classes from
 * content-lib/loader/errors.ts, reused directly).
 *
 * The one deliberate, disclosed behavioral difference: this module
 * CACHES its parsed/validated results after the first call, where the
 * web loader explicitly does not. That is a correct adaptation, not a
 * shortcut -- the web loader re-reads from disk on every call because a
 * dev server's /content can change under it; the mobile manifest is
 * bundled into the app binary at build time and cannot change at
 * runtime, so re-validating the same 160+ records through Zod on every
 * call would only cost battery/CPU for no benefit.
 *
 * No content transformation happens anywhere in this file -- every
 * value is exactly what the corresponding /content/*.json file
 * contains, only parsed and validated.
 */

interface ZodLikeSchema<T> {
  safeParse(data: unknown): ZodSafeParseResult<T>;
}

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.length ? issue.path.join(".") : "(root)"}: ${issue.message}`).join("\n");
}

function parseAll<T>(schema: ZodLikeSchema<T>, raws: unknown[], contentTypeLabel: string, sourceLabel: (index: number) => string): T[] {
  return raws.map((raw, index) => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new ContentValidationError(sourceLabel(index), contentTypeLabel, formatZodError(result.error));
    }
    return result.data;
  });
}

function assertNoDuplicateSlugs<T extends { slug: string }>(records: T[], contentTypeLabel: string, sourceLabel: (index: number) => string): void {
  const bySlug = new Map<string, string[]>();
  records.forEach((record, index) => {
    const list = bySlug.get(record.slug) ?? [];
    list.push(sourceLabel(index));
    bySlug.set(record.slug, list);
  });
  for (const [slug, sources] of bySlug) {
    if (sources.length > 1) throw new DuplicateSlugError(contentTypeLabel, slug, sources);
  }
}

// ---------------------------------------------------------------------------
// Divya Desams
// ---------------------------------------------------------------------------

let divyaDesamsCache: DivyaDesam[] | null = null;

function allDivyaDesams(): DivyaDesam[] {
  if (!divyaDesamsCache) {
    const parsed = parseAll(DivyaDesamSchema, rawDivyaDesams, "Divya Desam", (i) => `manifest:rawDivyaDesams[${i}]`);
    assertNoDuplicateSlugs(parsed, "Divya Desam", (i) => `manifest:rawDivyaDesams[${i}]`);
    divyaDesamsCache = [...parsed].sort((a, b) => a.slug.localeCompare(b.slug));
  }
  return divyaDesamsCache;
}

export function loadDivyaDesams(): DivyaDesam[] {
  return allDivyaDesams();
}

export function loadDivyaDesam(slug: string): DivyaDesam | null {
  return allDivyaDesams().find((d) => d.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Knowledge
// ---------------------------------------------------------------------------

let knowledgeCache: Knowledge[] | null = null;

function allKnowledge(): Knowledge[] {
  if (!knowledgeCache) {
    const parsed = parseAll(KnowledgeSchema, rawKnowledge, "Knowledge", (i) => `manifest:rawKnowledge[${i}]`);
    assertNoDuplicateSlugs(parsed, "Knowledge", (i) => `manifest:rawKnowledge[${i}]`);
    knowledgeCache = [...parsed].sort((a, b) => a.slug.localeCompare(b.slug));
  }
  return knowledgeCache;
}

export function loadKnowledge(): Knowledge[] {
  return allKnowledge();
}

export function loadKnowledgeRecord(slug: string): Knowledge | null {
  return allKnowledge().find((k) => k.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Books + Chapters
// ---------------------------------------------------------------------------

interface ParsedBookGroup {
  book: Book;
  chapters: Chapter[];
}

let bookGroupsCache: ParsedBookGroup[] | null = null;

function allBookGroups(): ParsedBookGroup[] {
  if (!bookGroupsCache) {
    const groups = rawBookGroups.map((group, groupIndex) => {
      const bookResult = BookSchema.safeParse(group.book);
      if (!bookResult.success) {
        throw new ContentValidationError(`manifest:rawBookGroups[${groupIndex}].book`, "Book", formatZodError(bookResult.error));
      }
      const chapters = parseAll(
        ChapterSchema,
        group.chapters,
        "Chapter",
        (i) => `manifest:rawBookGroups[${groupIndex}].chapters[${i}]`
      );

      const byOrder = new Map<number, string[]>();
      chapters.forEach((chapter, i) => {
        const list = byOrder.get(chapter.order) ?? [];
        list.push(`manifest:rawBookGroups[${groupIndex}].chapters[${i}]`);
        byOrder.set(chapter.order, list);
      });
      for (const [order, sources] of byOrder) {
        if (sources.length > 1) throw new DuplicateChapterOrderError(bookResult.data.slug, order, sources);
      }

      return {
        book: bookResult.data,
        chapters: [...chapters].sort((a, b) => a.order - b.order),
      };
    });

    assertNoDuplicateSlugs(
      groups.map((g) => g.book),
      "Book",
      (i) => `manifest:rawBookGroups[${i}].book`
    );

    bookGroupsCache = [...groups].sort((a, b) => a.book.slug.localeCompare(b.book.slug));
  }
  return bookGroupsCache;
}

export function loadBooks(): Book[] {
  return allBookGroups().map((g) => g.book);
}

export function loadBook(slug: string): Book | null {
  return allBookGroups().find((g) => g.book.slug === slug)?.book ?? null;
}

export function loadChapters(bookSlug: string): Chapter[] {
  return allBookGroups().find((g) => g.book.slug === bookSlug)?.chapters ?? [];
}

export function loadChapter(bookSlug: string, chapterSlug: string): Chapter | null {
  return loadChapters(bookSlug).find((c) => c.slug === chapterSlug) ?? null;
}

export type { Book, BookPart, Chapter, DivyaDesam, Knowledge } from "../../content-lib/schemas/index.ts";
