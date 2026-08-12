/**
 * Renders a long-form migrated text field as readable paragraphs, WITHOUT
 * altering the underlying text. Originally Phase 5K (Sthala Puranam /
 * Azhwar Pasuram); relocated to components/shared/ and given an optional
 * `heading` in Phase 5L so it can also render a Chapter/Knowledge body
 * directly beneath the page's own <h1> title, with no separate heading
 * invented for it. Existing callers that always pass a heading (the
 * Divya Desam detail page) are unaffected.
 *
 * The stored value is source prose, not authored markdown -- this only
 * splits on the paragraph breaks already present in the string; it never
 * rewrites, trims interior whitespace, or otherwise touches the text
 * content itself.
 */
export function LongFormSection({ heading, text }: { heading?: string; text: string }) {
  const paragraphs = text.split(/\n{2,}/);
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
      <div className="prose-body space-y-4 whitespace-pre-line">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
