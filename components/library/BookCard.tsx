import Link from "next/link";
import type { Book } from "@/content-lib/schemas";
import { DraftBadge } from "@/components/shared/DraftBadge";

/**
 * One row of the Library index. Chapter count is read directly from the
 * Book record's own `chapterOrder` array (already loaded, no extra
 * loader call needed) -- a structural fact, not a fabricated summary.
 * Author/description are rendered only when actually present; today's
 * one real book has neither, so this section correctly renders nothing
 * extra rather than inventing them.
 */
export function BookCard({ book }: { book: Book }) {
  const chapterCount = book.chapterOrder.length;

  return (
    <li className="py-4">
      <Link href={`/library/${book.slug}`} className="block hover:underline">
        <span className="font-medium">{book.title}</span>
      </Link>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
      </p>
      {book.description ? (
        <p className="mt-1 text-sm text-[var(--muted)]">{book.description}</p>
      ) : null}
      <div className="mt-1">
        <DraftBadge status={book.status} needsReview={book.migration.needsReview} />
      </div>
    </li>
  );
}
