import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Renders the escaped JSON-LD string (lib/json-ld.ts) as a normal JSX
 * text child of <script> -- no `dangerouslySetInnerHTML`. React renders
 * <script> children verbatim as text content, so the pre-escaped string
 * is exactly what reaches the page's HTML, unmodified further.
 *
 * Every caller passes data built entirely from already-validated content
 * -record fields -- never raw user input (search query text is never
 * embedded in structured data by this application).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json">{serializeJsonLd(data)}</script>;
}
