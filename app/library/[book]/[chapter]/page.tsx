import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadBook, loadChapter } from "@/content-lib/loader";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { DraftBadge } from "@/components/shared/DraftBadge";
import { RecordImages } from "@/components/shared/RecordImages";
import { LongFormSection } from "@/components/shared/LongFormSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { truncateForDescription } from "@/lib/metadata";

/**
 * Phase 5L -- real, loader-driven Chapter detail page.
 *
 * The chapter body is rendered via LongFormSection with NO heading
 * (the page's own <h1> is already the chapter title -- no second,
 * invented heading is added above the body). The stored body text is
 * rendered exactly as migrated: no rewriting, spelling correction,
 * capitalization normalization, summarization, or markdown conversion.
 * Several real chapters' stored body text happens to repeat the title as
 * its own first line (a source/content characteristic, not something
 * this page adds or removes).
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}): Promise<Metadata> {
  const { book: bookSlug, chapter: chapterSlug } = await params;
  const chapter = loadChapter(bookSlug, chapterSlug);
  if (!chapter) return { title: "Chapter" };

  return {
    title: chapter.title,
    description: truncateForDescription(chapter.body),
    alternates: { canonical: `/library/${bookSlug}/${chapter.slug}` },
  };
}

export default async function LibraryChapterPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book: bookSlug, chapter: chapterSlug } = await params;
  const book = loadBook(bookSlug);
  if (!book) notFound();
  const chapter = loadChapter(bookSlug, chapterSlug);
  if (!chapter) notFound();

  return (
    <div className="space-y-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: chapter.title,
        }}
      />
      <Breadcrumbs
        trail={[
          { href: "/library", label: "Library" },
          { href: `/library/${book.slug}`, label: book.title },
        ]}
        current={chapter.title}
      />

      <div className="space-y-2">
        <DraftBadge status={chapter.status} needsReview={chapter.migration.needsReview} />
        <h1 className="page-title">{chapter.title}</h1>
      </div>

      <RecordImages images={chapter.images} />

      {chapter.body ? (
        <LongFormSection text={chapter.body} />
      ) : (
        <p className="prose-body text-[var(--muted)]">
          No content is available for this chapter yet.
        </p>
      )}
    </div>
  );
}
