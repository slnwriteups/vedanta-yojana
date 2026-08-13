import type { Metadata } from "next";
import { loadKnowledge } from "@/content-lib/loader";
import { KnowledgeCard } from "@/components/knowledge/KnowledgeCard";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Knowledge",
  description:
    "Supporting philosophical and devotional material related to Sanātana Dharma.",
  alternates: { canonical: siteUrl("/knowledge") },
};

/**
 * Phase 5L -- real, loader-driven Knowledge index. Every record comes
 * from loadKnowledge(); none is hard-coded. Today there is exactly one
 * such record, rendered because the loader returned it, not because its
 * title is written into this file.
 */
export default function KnowledgeIndexPage() {
  const records = loadKnowledge();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="page-title">Knowledge</h1>
        <p className="prose-body max-w-2xl text-[var(--muted)]">
          Supporting philosophical and devotional material related to
          Sanātana Dharma.
        </p>
      </div>

      {records.length > 0 ? (
        <ul role="list" className="divide-y divide-[var(--border)]">
          {records.map((record) => (
            <KnowledgeCard key={record.slug} record={record} />
          ))}
        </ul>
      ) : (
        <p className="prose-body text-[var(--muted)]">No records are available yet.</p>
      )}
    </div>
  );
}
