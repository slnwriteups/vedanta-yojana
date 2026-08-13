import { loadBooks, loadChapters, loadDivyaDesams, loadKnowledge } from "../loader/index.ts";
import type { SearchDocument, SearchField } from "./types.ts";

/**
 * Builds the full searchable corpus from the existing content loader --
 * the ONLY function in the search feature that touches the loader (and
 * therefore the only place with any I/O). Every downstream search
 * function (searchContent, rankSearchResults, createExcerpt) is a pure
 * function over this in-memory array.
 *
 * Rebuilt fresh on every call -- deliberately no module-level cache or
 * mutable state, matching the loader's own no-caching behavior.
 *
 * Page150 is structurally excluded, not filtered out: it is a
 * HeldBackRecord, not a DivyaDesam, has no slug, and is never returned
 * by loadDivyaDesams() -- there is no code path here that could include
 * it even by accident.
 */
function field(name: string, tier: SearchField["tier"], text: string | undefined | null): SearchField[] {
  return text ? [{ name, tier, text }] : [];
}

/** Mirrors the Phase 5K index page's source-derived ordering, used here only as a search tie-break. */
function sourcePageNumber(sourcePageId: string): number {
  const match = sourcePageId.match(/^page\.Page(\d+)$/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

export function buildSearchCorpus(): SearchDocument[] {
  const documents: SearchDocument[] = [];

  for (const dd of loadDivyaDesams()) {
    const fields: SearchField[] = [
      ...field("displayName", "title", dd.displayName),
      ...field("moolavar", "strong", dd.templeInformation.moolavar),
      ...field("thayaar", "strong", dd.templeInformation.thayaar),
      ...field("vimanam", "strong", dd.templeInformation.vimanam),
      ...field("theertham", "strong", dd.templeInformation.theertham),
      ...field("travelNote", "strong", dd.templeInformation.travelNote),
      ...dd.shrines.flatMap((shrine) => [
        ...field("shrineLabel", "strong", shrine.label),
        ...field("shrineName", "strong", shrine.name),
        ...field("shrineMoolavar", "strong", shrine.templeInformation?.moolavar),
        ...field("shrineThayaar", "strong", shrine.templeInformation?.thayaar),
        ...field("shrineVimanam", "strong", shrine.templeInformation?.vimanam),
        ...field("shrineTheertham", "strong", shrine.templeInformation?.theertham),
        ...field("shrineSthalaPuranam", "body", shrine.sthalaPuranam),
        ...field("shrineAzhwarPasuram", "body", shrine.azhwarPasuram),
      ]),
      ...field("sthalaPuranam", "body", dd.sthalaPuranam),
      ...field("azhwarPasuram", "body", dd.azhwarPasuram),
    ];
    documents.push({
      type: "divya-desam",
      title: dd.displayName,
      href: `/divya-desams/${dd.slug}`,
      status: dd.status,
      needsReview: dd.migration.needsReview,
      sourceOrder: sourcePageNumber(dd.migration.sourcePageId),
      fields,
    });
  }

  for (const book of loadBooks()) {
    const bookFields: SearchField[] = [
      ...field("title", "title", book.title),
      ...field("author", "strong", book.author),
      ...field("description", "strong", book.description),
    ];
    documents.push({
      type: "book",
      title: book.title,
      href: `/library/${book.slug}`,
      status: book.status,
      needsReview: book.migration.needsReview,
      sourceOrder: 0,
      fields: bookFields,
    });

    for (const chapter of loadChapters(book.slug)) {
      const chapterFields: SearchField[] = [
        ...field("title", "title", chapter.title),
        ...field("parentBookTitle", "strong", book.title),
        ...field("body", "body", chapter.body),
      ];
      documents.push({
        type: "chapter",
        title: chapter.title,
        href: `/library/${book.slug}/${chapter.slug}`,
        parentTitle: book.title,
        status: chapter.status,
        needsReview: chapter.migration.needsReview,
        sourceOrder: chapter.order,
        fields: chapterFields,
      });
    }
  }

  for (const record of loadKnowledge()) {
    const fields: SearchField[] = [
      ...field("title", "title", record.title),
      ...field("contentType", "strong", record.contentType),
      ...field("body", "body", record.body),
    ];
    documents.push({
      type: "knowledge",
      title: record.title,
      href: `/divya-desams/${record.slug}`,
      status: record.status,
      needsReview: record.migration.needsReview,
      sourceOrder: 0,
      fields,
    });
  }

  return documents;
}
