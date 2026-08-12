import type { TempleInformation as TempleInformationData } from "@/content-lib/schemas";

/**
 * Renders only the templeInformation fields actually present. A handful
 * of records (the known Page24/Page38/Page40 multi-shrine cases, plus at
 * least one other record where the source text had no recognizable
 * labels) have an entirely empty templeInformation object -- in that
 * case this renders nothing at all, not an empty heading or fabricated
 * "Unknown" placeholders.
 */

const FIELD_LABELS: Record<keyof TempleInformationData, string> = {
  moolavar: "Moolavar",
  thayaar: "Thayaar",
  vimanam: "Vimanam",
  theertham: "Theertham",
  travelNote: "How to reach",
};

const FIELD_ORDER: (keyof TempleInformationData)[] = [
  "moolavar",
  "thayaar",
  "vimanam",
  "theertham",
  "travelNote",
];

export function TempleInformation({ info }: { info: TempleInformationData }) {
  const presentFields = FIELD_ORDER.filter((key) => info[key]);
  if (presentFields.length === 0) return null;

  return (
    <section aria-labelledby="temple-information-heading" className="space-y-3">
      <h2 id="temple-information-heading" className="section-heading">
        Temple Information
      </h2>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {presentFields.map((key) => (
          <div key={key}>
            <dt className="eyebrow">{FIELD_LABELS[key]}</dt>
            <dd className="prose-body mt-1">{info[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
