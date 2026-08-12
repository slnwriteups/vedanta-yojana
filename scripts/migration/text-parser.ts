import { AmbiguousLabelError } from "./errors.ts";

/**
 * Deterministic parser for the source's "Details of Kshethram"-style
 * structured text — one or more recognized `Label:` markers embedded
 * inside free-form prose, which may all appear within a single combined
 * text block (per Phase 5A findings; the real source does not reliably
 * put one label per block).
 *
 * This is NOT a generative/heuristic parser. It only recognizes an
 * explicit, fixed set of labels and splits the text at their exact
 * positions. Anything before the first recognized label, or between
 * labels that isn't part of a captured span, is simply not part of any
 * destination field — it is not an error, and it is not guessed at.
 */

export type ParsedTempleField =
  | "moolavar"
  | "thayaar"
  | "vimanam"
  | "theertham"
  | "travelNote"
  | "sthalaPuranam"
  | "azhwarPasuram";

interface LabelDefinition {
  pattern: RegExp;
  field: ParsedTempleField;
}

// Order does not matter for correctness (matches are re-sorted by position
// found), but is kept roughly in source-document order for readability.
// `\s*` before the colon tolerates the real source's occasional
// "Sthala Puranam :" (space before colon) without inventing a broader
// normalization rule.
const LABEL_DEFINITIONS: LabelDefinition[] = [
  { pattern: /Moolavar\s*:/g, field: "moolavar" },
  { pattern: /Thayaar\s*:/g, field: "thayaar" },
  { pattern: /Vimanam\s*:/g, field: "vimanam" },
  { pattern: /Pushkarani\s*:/g, field: "theertham" },
  { pattern: /Pushkarini\s*:/g, field: "theertham" },
  { pattern: /Travel\s*:/g, field: "travelNote" },
  { pattern: /Sthala Puranam\s*:/g, field: "sthalaPuranam" },
  { pattern: /Azhwar Pasuram\s*:/g, field: "azhwarPasuram" },
];

interface LabelMatch {
  field: ParsedTempleField;
  label: string;
  start: number;
  contentStart: number;
}

function findLabelMatches(text: string): LabelMatch[] {
  const matches: LabelMatch[] = [];
  for (const def of LABEL_DEFINITIONS) {
    const re = new RegExp(def.pattern.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({
        field: def.field,
        label: m[0],
        start: m.index,
        contentStart: m.index + m[0].length,
      });
    }
  }
  matches.sort((a, b) => a.start - b.start);
  return matches;
}

/**
 * The only normalization applied to an extracted value: trimming leading
 * and trailing whitespace/newlines. All *internal* newlines and paragraph
 * breaks are preserved exactly as found in the source. This is the
 * complete, documented mechanical normalization referenced by Phase 5E
 * section 15 — nothing else is altered.
 */
function trimBoundaryWhitespaceOnly(value: string): string {
  return value.trim();
}

export interface ParsedTempleDetails {
  templeInformation: {
    moolavar?: string;
    thayaar?: string;
    vimanam?: string;
    theertham?: string;
    travelNote?: string;
  };
  sthalaPuranam?: string;
  azhwarPasuram?: string;
}

export function parseTempleDetails(text: string): ParsedTempleDetails {
  const matches = findLabelMatches(text);

  const seenFields = new Set<ParsedTempleField>();
  for (const m of matches) {
    if (seenFields.has(m.field)) {
      throw new AmbiguousLabelError(m.field, m.label);
    }
    seenFields.add(m.field);
  }

  const templeInformation: ParsedTempleDetails["templeInformation"] = {};
  let sthalaPuranam: string | undefined;
  let azhwarPasuram: string | undefined;

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const rawValue = text.slice(current.contentStart, next ? next.start : text.length);
    const value = trimBoundaryWhitespaceOnly(rawValue);

    if (!value) continue; // Nothing after the label -> omit the field, never fabricate a placeholder.

    switch (current.field) {
      case "moolavar":
        templeInformation.moolavar = value;
        break;
      case "thayaar":
        templeInformation.thayaar = value;
        break;
      case "vimanam":
        templeInformation.vimanam = value;
        break;
      case "theertham":
        templeInformation.theertham = value;
        break;
      case "travelNote":
        templeInformation.travelNote = value;
        break;
      case "sthalaPuranam":
        sthalaPuranam = value;
        break;
      case "azhwarPasuram":
        azhwarPasuram = value;
        break;
    }
  }

  return { templeInformation, sthalaPuranam, azhwarPasuram };
}
