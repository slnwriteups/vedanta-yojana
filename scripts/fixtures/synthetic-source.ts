import type {
  SourceBookRecord,
  SourceChapterRecord,
  SourceClassification,
  SourceContentBlock,
  SourceDivyaDesamRecord,
  SourceExternalLink,
  SourceGenericRecord,
  SourceImageRegistry,
  SourceImageRegistryEntry,
  SourceKnowledgeRecord,
} from "../migration/types.ts";

/**
 * Synthetic source fixtures ONLY — resembling the real content-extraction/
 * shape structurally, but every value here is invented for testing.
 *
 * No real temple names, deity names, prose, URLs, image UUIDs,
 * sourcePageIds, captions, or PDF links appear anywhere in this file.
 * Fictional placeholders (e.g. "page.TestTemple1", "Example Shrine",
 * "https://example.test/...") are used deliberately so nothing here could
 * be mistaken for recovered content.
 */

export function makeClassification(overrides: Partial<SourceClassification> = {}): SourceClassification {
  return {
    category: "divya_desam_candidate",
    confidence: "high",
    ...overrides,
  };
}

export function makeTextBlock(content: string): SourceContentBlock {
  return { type: "text", content };
}

export function makeButtonBlock(label: string): SourceContentBlock {
  return { type: "button", label };
}

export function makePictureBlock(sourceAssetUuid: string): SourceContentBlock {
  return { type: "picture", imageAssetRef: `ag-asset://${sourceAssetUuid}` };
}

export function makeMapsLink(overrides: Partial<SourceExternalLink> = {}): SourceExternalLink {
  return {
    url: "https://example.test/maps/example-shrine",
    resourceType: "google_maps_location",
    sourceComponentLabel: "Maps",
    ...overrides,
  };
}

export function makePdfLink(overrides: Partial<SourceExternalLink> = {}): SourceExternalLink {
  return {
    url: "https://example.test/slokas/english/example-pasurangal.pdf",
    resourceType: "sloka_pdf_prapatti",
    sourceComponentLabel: "English Pasuram",
    ...overrides,
  };
}

/**
 * Builds a single combined "Details of Kshethram"-style text block,
 * exercising every recognized label at once. Pass `theerthamLabel` to
 * test the "Pushkarani:" vs "Pushkarini:" spelling variants (both must
 * map to the same destination field).
 */
export function buildKshethramDetailsText(
  options: {
    moolavar?: string;
    thayaar?: string;
    vimanam?: string;
    theerthamLabel?: "Pushkarani" | "Pushkarini";
    theerthamValue?: string;
    travelNote?: string;
    azhwarPasuram?: string;
  } = {}
): string {
  const {
    moolavar = "Example Deity",
    thayaar = "Example Consort",
    vimanam = "Example Vimanam",
    theerthamLabel = "Pushkarani",
    theerthamValue = "Example Theertham",
    travelNote = "This example kshethram is located 5 km from Example City.",
    azhwarPasuram = "Example Azhwar: 3 example pasurams\nTotal: 3 example pasurams",
  } = options;

  return (
    `Details of Kshethram:\n` +
    `Moolavar: ${moolavar}\n` +
    `Thayaar: ${thayaar}\n` +
    `Vimanam: ${vimanam}\n` +
    `${theerthamLabel}: ${theerthamValue}\n` +
    `Travel: ${travelNote}\n\n` +
    `Azhwar Pasuram:\n${azhwarPasuram}\n`
  );
}

export function buildSthalaPuranamText(narrative = "According to this example legend, the shrine's origin is told in a synthetic story used only to test text extraction.\n\nA second synthetic paragraph follows, to prove internal newlines survive unchanged."): string {
  return `Sthala Puranam:\n${narrative}`;
}

export function makeImageRegistryEntry(
  overrides: Partial<SourceImageRegistryEntry> = {}
): SourceImageRegistryEntry {
  return {
    assetUuid: "11111111-1111-4111-8111-111111111111",
    sourceOriginalName: "example-photo.jpg",
    ...overrides,
  };
}

export function makeImageRegistry(entries: SourceImageRegistryEntry[]): SourceImageRegistry {
  const registry: SourceImageRegistry = new Map();
  for (const entry of entries) {
    registry.set(entry.assetUuid, entry);
  }
  return registry;
}

export function makeDivyaDesamSource(
  overrides: Partial<SourceDivyaDesamRecord> = {}
): SourceDivyaDesamRecord {
  const pageId = overrides.pageId ?? "page.TestTemple1";
  return {
    pageId,
    title: "Example Shrine",
    classification: makeClassification(),
    imageAssetRefs: ["11111111-1111-4111-8111-111111111111"],
    externalLinks: [makeMapsLink({ pageId }), makePdfLink({ pageId })],
    contentBlocks: [
      makeTextBlock("Example Shrine"),
      makePictureBlock("11111111-1111-4111-8111-111111111111"),
      makeTextBlock(buildKshethramDetailsText()),
      makeButtonBlock("Maps"),
      makeButtonBlock("English Pasuram"),
      makeTextBlock(buildSthalaPuranamText()),
    ],
    ...overrides,
  };
}

export function makeBookSource(overrides: Partial<SourceBookRecord> = {}): SourceBookRecord {
  return {
    pageId: "page.TestBook1",
    title: "Example Book Title",
    classification: makeClassification({ category: "non_temple_content_candidate", confidence: "high" }),
    ...overrides,
  };
}

export function makeChapterSource(overrides: Partial<SourceChapterRecord> = {}): SourceChapterRecord {
  return {
    pageId: "page.TestChapter1",
    title: "Example Chapter Title",
    order: 1,
    classification: makeClassification({ category: "non_temple_content_candidate", confidence: "high" }),
    contentBlocks: [
      makeTextBlock("Example Chapter Title"),
      makeTextBlock("This is an example chapter body used only to test transformation mechanics."),
    ],
    imageAssetRefs: [],
    ...overrides,
  };
}

export function makeKnowledgeSource(
  overrides: Partial<SourceKnowledgeRecord> = {}
): SourceKnowledgeRecord {
  return {
    pageId: "page.TestKnowledge1",
    title: "Example Knowledge Title",
    contentType: "educational",
    classification: makeClassification({ category: "non_temple_content_candidate", confidence: "high" }),
    contentBlocks: [
      makeTextBlock("Example Knowledge Title"),
      makeTextBlock("This is an example knowledge body used only to test transformation mechanics."),
    ],
    imageAssetRefs: [],
    ...overrides,
  };
}

export function makeGenericSource(overrides: Partial<SourceGenericRecord> = {}): SourceGenericRecord {
  const pageId = overrides.pageId ?? "page.TestUnresolved1";
  return {
    pageId,
    title: "Example Unresolved Item",
    classification: makeClassification({ category: "unresolved_possible_divya_desam", confidence: "low" }),
    contentBlocks: [
      makeTextBlock("Example Unresolved Item"),
      makeTextBlock("This is example content for a record whose destination type is not yet decided."),
    ],
    externalLinks: [makePdfLink({ pageId, sourceComponentLabel: "Example Stotram English" })],
    ...overrides,
  };
}
