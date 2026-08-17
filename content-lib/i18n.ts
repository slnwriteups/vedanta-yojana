import type { Book, Chapter, DivyaDesam, Knowledge, LanguageCode } from "./schemas/index.ts";

/**
 * Applies a record's own `translations[language]` on top of its base
 * (English) fields, FIELD BY FIELD -- a translation that only covers
 * some fields (e.g. templeInformation but not yet the long Sthala
 * Puranam narrative) still applies exactly what it has, falling back to
 * English per-field rather than all-or-nothing per-record. `language:
 * null` (or a language the record has no translations object for at
 * all) returns the record completely untouched -- these are pure,
 * non-mutating functions; the original English record itself is never
 * altered on disk or in memory.
 */

export function localizeDivyaDesam(record: DivyaDesam, language: LanguageCode | null): DivyaDesam {
  const t = language ? record.translations?.[language] : undefined;
  if (!t) return record;

  return {
    ...record,
    displayName: t.displayName ?? record.displayName,
    templeInformation: t.templeInformation
      ? { ...record.templeInformation, ...t.templeInformation }
      : record.templeInformation,
    sthalaPuranam: t.sthalaPuranam ?? record.sthalaPuranam,
    azhwarPasuram: t.azhwarPasuram ?? record.azhwarPasuram,
    shrines: record.shrines.map((shrine, index) => {
      const st = t.shrines?.[String(index)];
      if (!st) return shrine;
      return {
        ...shrine,
        name: st.name ?? shrine.name,
        templeInformation: st.templeInformation
          ? { ...shrine.templeInformation, ...st.templeInformation }
          : shrine.templeInformation,
        sthalaPuranam: st.sthalaPuranam ?? shrine.sthalaPuranam,
        azhwarPasuram: st.azhwarPasuram ?? shrine.azhwarPasuram,
      };
    }),
  };
}

export function localizeChapter(record: Chapter, language: LanguageCode | null): Chapter {
  const t = language ? record.translations?.[language] : undefined;
  if (!t) return record;
  return { ...record, title: t.title ?? record.title, body: t.body ?? record.body };
}

export function localizeKnowledge(record: Knowledge, language: LanguageCode | null): Knowledge {
  const t = language ? record.translations?.[language] : undefined;
  if (!t) return record;
  return { ...record, title: t.title ?? record.title, body: t.body ?? record.body };
}

export function localizeBook(record: Book, language: LanguageCode | null): Book {
  const t = language ? record.translations?.[language] : undefined;
  if (!t) return record;
  return {
    ...record,
    title: t.title ?? record.title,
    description: t.description ?? record.description,
  };
}
