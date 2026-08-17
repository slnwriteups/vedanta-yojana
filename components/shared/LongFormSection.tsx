import { paragraphsForReading } from "@/content-lib/text-format";

/**
 * Renders a long-form migrated text field as readable paragraphs, WITHOUT
 * altering the underlying text. Originally Phase 5K (Sthala Puranam /
 * Azhwar Pasuram); relocated to components/shared/ and given an optional
 * `heading` in Phase 5L so it can also render a Chapter/Knowledge body
 * directly beneath the page's own <h1> title, with no separate heading
 * invented for it. Existing callers that always pass a heading (the
 * Divya Desam detail page) are unaffected.
 *
 * The stored value is source prose, not authored markdown. Real
 * blank-line paragraph breaks are always honored first; on top of that,
 * paragraphsForReading (content-lib/text-format.ts) only adds a visual
 * break at an EXISTING sentence boundary when a block is too long to
 * read comfortably as one paragraph -- it never rewrites, trims interior
 * whitespace, truncates, or otherwise touches the text content itself.
 */
export function LongFormSection({ heading, text }: { heading?: string; text: string }) {
  const paragraphs = paragraphsForReading(text);
  const headingId = heading
    ? `${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`
    : undefined;

  return (
    <section aria-labelledby={headingId} className="max-w-2xl space-y-3">
      {heading ? (
        <h2 id={headingId} className="section-heading">
          {heading}
        </h2>
      ) : null}
      <div className="prose-body space-y-5 whitespace-pre-line">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
