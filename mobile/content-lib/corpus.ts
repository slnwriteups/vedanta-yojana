import { loadBooks, loadChapters, loadDivyaDesams, loadKnowledge } from "./loader.ts";
import { sourcePageNumber } from "./ordering.ts";
import type { SearchDocument, SearchField } from "../../content-lib/search/types.ts";

/**
 * Phase 6B -- the mobile search corpus builder. Mirrors
 * content-lib/search/corpus.ts's buildSearchCorpus() field-for-field, but
 * calls the MOBILE loader (./loader.ts, Metro-bundled) instead of the
 * Node-fs-backed web loader (../../content-lib/loader/index.ts). Not
 * reused directly because the web version is hard-wired to the web
 * loader's import; everything downstream (searchContent, rankSearchResults,
 * createExcerpt, searchCorpus) is untouched and reused directly from
 * ../../content-lib/search/ -- only the one I/O boundary is re-pointed.
 *
 * No caching here, matching the web corpus builder's own behavior: it is
 * cheap to rebuild from the mobile loader's own (already-cached) parsed
 * records, and search results should never be stale relative to a corpus
 * some earlier screen already triggered.
 */

function field(name: string, tier: SearchField["tier"], text: string | undefined | null): SearchField[] {
  return text ? [{ name, tier, text }] : [];
}

/** Permissive tie-break variant: search must never crash over a sort key. */
function safeSourcePageNumber(sourcePageId: string): number {
  try {
    return sourcePageNumber(sourcePageId);
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

export function buildMobileSearchCorpus(): SearchDocument[] {
  const documents: SearchDocument[] = [];

  for (const dd of loadDivyaDesams()) {
    const fields: SearchField[] = [
      ...field("displayName", "title", dd.displayName),
      ...field("moolavar", "strong", dd.templeInformation.moolavar),
      ...field("thayaar", "strong", dd.templeInformation.thayaar),
      ...field("vimanam", "strong", dd.templeInformation.vimanam),
      ...field("theertham", "strong", dd.templeInformation.theertham),
      ...field("travelNote", "strong", dd.templeInformation.travelNote),
      ...dd.shrines.flatMap((shrine) => field("shrineLabel", "strong", shrine.label)),
      ...field("sthalaPuranam", "body", dd.sthalaPuranam),
      ...field("azhwarPasuram", "body", dd.azhwarPasuram),
    ];
    documents.push({
      type: "divya-desam",
      title: dd.displayName,
      href: `/divya-desams/${dd.slug}`,
      status: dd.status,
      needsReview: dd.migration.needsReview,
      sourceOrder: safeSourcePageNumber(dd.migration.sourcePageId),
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
      href: `/knowledge/${record.slug}`,
      status: record.status,
      needsReview: record.migration.needsReview,
      sourceOrder: 0,
      fields,
    });
  }

  return documents;
}
