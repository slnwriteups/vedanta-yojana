import Link from "next/link";
import type { RelatedContentRef } from "@/content-lib/schemas";
import { loadDivyaDesam, loadBook, loadKnowledgeRecord } from "@/content-lib/loader";

/**
 * Resolves relatedContent[] entries through the existing loader and
 * renders only the ones that actually resolve to a real record --
 * "render it only if valid and resolvable through the loader" (Phase 5L
 * brief). A "chapter" reference cannot actually be resolved:
 * RelatedContentRefSchema only carries {type, slug}, with no book-slug
 * context to call loadChapter(bookSlug, chapterSlug) with -- that is a
 * structural fact about the existing (protected, unmodified) schema, not
 * something this phase can fix. Chapter-type references are therefore
 * skipped rather than guessed at. No real Knowledge record currently has
 * any relatedContent (introduction.json's is []), so this entire
 * component is unexercised by real data today -- it exists for schema
 * conformance and future records.
 */
export function RelatedContentLinks({ items }: { items: RelatedContentRef[] }) {
  const resolved = items
    .map(resolveRelatedContent)
    .filter((entry): entry is { href: string; label: string } => entry !== null);

  if (resolved.length === 0) return null;

  return (
    <section aria-labelledby="related-content-heading" className="space-y-3">
      <h2 id="related-content-heading" className="section-heading">
        Related
      </h2>
      <ul role="list" className="flex flex-wrap gap-3 text-sm">
        {resolved.map((entry) => (
          <li key={entry.href}>
            <Link href={entry.href} className="hover:underline">
              {entry.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function resolveRelatedContent(item: RelatedContentRef): { href: string; label: string } | null {
  switch (item.type) {
    case "divya-desam": {
      const record = loadDivyaDesam(item.slug);
      return record ? { href: `/divya-desams/${record.slug}`, label: record.displayName } : null;
    }
    case "book": {
      const record = loadBook(item.slug);
      return record ? { href: `/library/${record.slug}`, label: record.title } : null;
    }
    case "knowledge": {
      const record = loadKnowledgeRecord(item.slug);
      return record ? { href: `/divya-desams/${record.slug}`, label: record.title } : null;
    }
    case "chapter":
      return null;
    default:
      return null;
  }
}
