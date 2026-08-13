import type { Metadata } from "next";
import { loadBooks } from "@/content-lib/loader";
import { BookCard } from "@/components/library/BookCard";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Library",
  description:
    "Recovered books, presented chapter by chapter as they are prepared for publication.",
  alternates: { canonical: siteUrl("/library") },
};

/**
 * Phase 5L -- real, loader-driven Library index. Every book comes from
 * loadBooks(); none is hard-coded. Today there is exactly one recovered
 * book, whose title (still an explicit editorial placeholder) is
 * rendered verbatim, exactly as migrated.
 */
export default function LibraryIndexPage() {
  const books = loadBooks();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="page-title">Library</h1>
        <p className="prose-body max-w-2xl text-[var(--muted)]">
          Recovered books, presented chapter by chapter as they are prepared
          for publication.
        </p>
      </div>

      {books.length > 0 ? (
        <ul role="list" className="divide-y divide-[var(--border)]">
          {books.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </ul>
      ) : (
        <p className="prose-body text-[var(--muted)]">No books are available yet.</p>
      )}
    </div>
  );
}
