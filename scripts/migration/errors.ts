/**
 * Structured error types for the migration transformation layer (Phase 5E).
 *
 * As in content-lib/loader/errors.ts, fields are assigned explicitly in
 * each constructor body rather than via TypeScript's constructor-
 * parameter-property shorthand, because Node's native (strip-only)
 * TypeScript execution — used by `npm run test:content` — does not
 * support that syntax.
 */

export class MigrationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/** Two different source titles produced the same destination slug. */
export class SlugCollisionError extends MigrationError {
  slug: string;
  sourcePageIds: string[];

  constructor(slug: string, sourcePageIds: string[]) {
    super(
      `Slug collision: "${slug}" would be produced by more than one source record: ` +
        sourcePageIds.join(", ")
    );
    this.slug = slug;
    this.sourcePageIds = sourcePageIds;
  }
}

/** The same structured-text label (or two label spellings mapping to the same field) appeared more than once in one text block. */
export class AmbiguousLabelError extends MigrationError {
  field: string;
  label: string;

  constructor(field: string, label: string) {
    super(
      `Ambiguous source text: the "${field}" field was matched more than once ` +
        `(most recently via label "${label}"). Refusing to guess which occurrence is correct.`
    );
    this.field = field;
    this.label = label;
  }
}

/** An imageAssetRef UUID has no corresponding entry in the image registry. */
export class MissingImageAssetError extends MigrationError {
  sourceAssetUuid: string;

  constructor(sourceAssetUuid: string) {
    super(`No image registry entry found for source asset UUID "${sourceAssetUuid}".`);
    this.sourceAssetUuid = sourceAssetUuid;
  }
}

/** A resource/shrine label did not match any entry in the explicit language/label lookup table. */
export class UnsupportedResourceLabelError extends MigrationError {
  label: string;

  constructor(label: string) {
    super(
      `Unsupported resource label "${label}": no entry exists in the language lookup table. ` +
        `Refusing to guess the language.`
    );
    this.label = label;
  }
}

/** An external link's declared pageId association does not match the record being transformed. */
export class LinkAssociationMismatchError extends MigrationError {
  expectedPageId: string;
  actualPageId: string;
  url: string;

  constructor(expectedPageId: string, actualPageId: string, url: string) {
    super(
      `External link association mismatch: link "${url}" declares pageId "${actualPageId}" ` +
        `but is being transformed as part of record "${expectedPageId}". Refusing to silently ` +
        `attach it to the wrong record.`
    );
    this.expectedPageId = expectedPageId;
    this.actualPageId = actualPageId;
    this.url = url;
  }
}
