import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadKnowledge, loadKnowledgeRecord } from "@/content-lib/loader";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { DraftBadge } from "@/components/shared/DraftBadge";
import { RecordImages } from "@/components/shared/RecordImages";
import { LongFormSection } from "@/components/shared/LongFormSection";
import { RelatedContentLinks } from "@/components/knowledge/RelatedContentLinks";
import { JsonLd } from "@/components/seo/JsonLd";
import { truncateForDescription } from "@/lib/metadata";
import { siteUrl } from "@/lib/site";

/**
 * Phase 5L -- real, loader-driven Knowledge detail page. Body rendered
 * exactly as stored, no separate invented heading above it (matching the
 * Chapter detail page's treatment). relatedContent is resolved through
 * the loader and only rendered when it actually resolves to a real
 * record (see components/knowledge/RelatedContentLinks.tsx).
 */

/** Every Knowledge URL to pre-render -- see the Divya Desam page for why. */
export function generateStaticParams() {
  return loadKnowledge().map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const record = loadKnowledgeRecord(slug);
  if (!record) return { title: "Knowledge" };

  return {
    title: record.title,
    description: truncateForDescription(record.body),
    alternates: { canonical: siteUrl(`/knowledge/${record.slug}`) },
  };
}

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = loadKnowledgeRecord(slug);
  if (!record) notFound();

  return (
    <div className="space-y-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: record.title,
        }}
      />
      <Breadcrumbs trail={[{ href: "/knowledge", label: "Knowledge" }]} current={record.title} />

      <div className="space-y-2">
        <DraftBadge status={record.status} needsReview={record.migration.needsReview} />
        <h1 className="page-title">{record.title}</h1>
      </div>

      <RecordImages images={record.images} />

      {record.body ? (
        <LongFormSection text={record.body} />
      ) : (
        <p className="prose-body text-[var(--muted)]">No content is available yet.</p>
      )}

      <RelatedContentLinks items={record.relatedContent} />
    </div>
  );
}
