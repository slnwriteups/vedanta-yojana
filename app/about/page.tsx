import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Vedanta Yojana is being developed as a digital reference for the 108 Divya Desams and related Vaishnava teachings.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h1 className="page-title">About</h1>
      <p className="prose-body max-w-2xl text-[var(--muted)]">
        Vedanta Yojana is being developed as a digital reference for the 108 Divya
        Desams and related Vaishnava teachings. Content on this site is currently in
        draft and under review, and is being prepared for publication.
      </p>
    </div>
  );
}
