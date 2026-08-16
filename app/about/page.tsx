import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Vedanta Yojana is a digital reference for the 108 Divya Desams and related Vaishnava teachings.",
  alternates: { canonical: siteUrl("/about") },
};

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h1 className="page-title">About</h1>
      <p className="prose-body max-w-2xl text-[var(--muted)]">
        Vedanta Yojana is a digital reference for the 108 Divya Desams and
        related Vaishnava teachings. The 108 Divya Desams are complete; the
        Library is still being prepared for publication.
      </p>
    </div>
  );
}
