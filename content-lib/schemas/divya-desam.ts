import { z } from "zod";
import {
  ImageEntrySchema,
  MigrationMetadataSchema,
  RelatedContentRefSchema,
  SlugSchema,
  StatusSchema,
} from "./shared.ts";

/**
 * Divya Desam content schema — Phase 5C.
 *
 * Represents the future application's Divya Desam model, NOT the old SAP
 * component/flow structure. No SAP component ids, flow ids, ag-asset://
 * URIs, page.PageN public identifiers, or navigation-edge data appear
 * here — only `migration.sourcePageId` (internal traceability metadata,
 * never a public URL).
 *
 * IMPORTANT: this schema does not know how many Divya Desam records exist,
 * does not enforce uniqueness of slugs/sourcePageIds across records, and
 * does not validate Page93/Page150 specifically. Those are cross-record
 * concerns for the post-migration validation stage (Phase 5I).
 */

// ---------------------------------------------------------------------------
// Temple information (free-form, parsed out of the source's
// "Details of Kshethram:" block during migration — every field here is
// legitimately optional because the source itself has records missing
// one or more of them).
// ---------------------------------------------------------------------------

export const TempleInformationSchema = z.object({
  moolavar: z.string().min(1).optional(),
  thayaar: z.string().min(1).optional(),
  vimanam: z.string().min(1).optional(),
  theertham: z.string().min(1).optional(),
  travelNote: z.string().min(1).optional(),
});
export type TempleInformation = z.infer<typeof TempleInformationSchema>;

// ---------------------------------------------------------------------------
// Shrines — supports the non-negotiable multi-shrine requirement: a single
// Divya Desam record may list zero, one, or many shrines. A missing Maps
// link for the whole temple is represented as an EMPTY shrines[] array,
// never as a shrine entry with a null/missing mapsLink.
// ---------------------------------------------------------------------------

export const ShrineSchema = z.object({
  label: z.string().min(1).nullable(),
  mapsLink: z.string().url(),
});
export type Shrine = z.infer<typeof ShrineSchema>;

// ---------------------------------------------------------------------------
// Resources — language-tagged external links (sloka/pasuram PDFs today).
// Exactly the 5 languages confirmed present in the source. `type` is kept
// as a single-value enum reflecting the one resource type recovered so
// far; extending it later (a schema-file edit) is expected as new
// resource kinds appear — this is not meant to be exhaustive forever.
// `sourceLabel` preserves the original button label for provenance and
// must never replace the normalized `language` field.
// ---------------------------------------------------------------------------

export const ResourceLanguageSchema = z.enum([
  "English",
  "Tamil",
  "Kannada",
  "Sanskrit",
  "Devanagari",
]);
export type ResourceLanguage = z.infer<typeof ResourceLanguageSchema>;

export const ResourceTypeSchema = z.enum(["pasuram-pdf"]);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

export const ResourceEntrySchema = z.object({
  language: ResourceLanguageSchema,
  type: ResourceTypeSchema,
  url: z.string().url(),
  sourceLabel: z.string().min(1).optional(),
});
export type ResourceEntry = z.infer<typeof ResourceEntrySchema>;

// ---------------------------------------------------------------------------
// Divya Desam
// ---------------------------------------------------------------------------

export const DivyaDesamSchema = z.object({
  slug: SlugSchema,
  displayName: z.string().min(1),
  status: StatusSchema,
  migration: MigrationMetadataSchema,
  templeInformation: TempleInformationSchema.default({}),
  sthalaPuranam: z.string().min(1).optional(),
  azhwarPasuram: z.string().min(1).optional(),
  shrines: z.array(ShrineSchema).default([]),
  images: z.array(ImageEntrySchema).default([]),
  resources: z.array(ResourceEntrySchema).default([]),
  relatedContent: z.array(RelatedContentRefSchema).default([]),
});
export type DivyaDesam = z.infer<typeof DivyaDesamSchema>;
