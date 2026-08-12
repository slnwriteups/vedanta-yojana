/**
 * Structured error types for the content loader (Phase 5D).
 *
 * These exist so a validation or structural problem in a content file
 * fails loudly and identifiably — file path, content type, and the
 * underlying detail — rather than surfacing as a generic thrown error.
 * Callers can `instanceof` these to distinguish failure kinds if useful.
 *
 * NOTE: fields are assigned explicitly in each constructor body rather
 * than using TypeScript's constructor-parameter-property shorthand
 * (`constructor(public readonly x: string)`). Node's native TypeScript
 * execution (used by `npm run test:content`, see tests/content/README.md)
 * only strips type syntax — it does not support parameter properties,
 * which require an actual code transform, not just type-stripping.
 */

export class ContentLoaderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/** A content file's contents could not be parsed as JSON at all. */
export class MalformedJsonError extends ContentLoaderError {
  filePath: string;

  constructor(filePath: string, cause: unknown) {
    super(
      `Malformed JSON in content file "${filePath}": ` +
        (cause instanceof Error ? cause.message : String(cause)),
      { cause }
    );
    this.filePath = filePath;
  }
}

/** A content file parsed as JSON but failed its Zod schema. */
export class ContentValidationError extends ContentLoaderError {
  filePath: string;
  contentType: string;
  details: string;

  constructor(filePath: string, contentType: string, details: string) {
    super(`Schema validation failed for ${contentType} file "${filePath}":\n${details}`);
    this.filePath = filePath;
    this.contentType = contentType;
    this.details = details;
  }
}

/** Two or more files in the same collection validated to the same slug. */
export class DuplicateSlugError extends ContentLoaderError {
  contentType: string;
  slug: string;
  filePaths: string[];

  constructor(contentType: string, slug: string, filePaths: string[]) {
    super(
      `Duplicate ${contentType} slug "${slug}" found in multiple files:\n` +
        filePaths.map((f) => `  - ${f}`).join("\n")
    );
    this.contentType = contentType;
    this.slug = slug;
    this.filePaths = filePaths;
  }
}

/** Two or more chapters within the same book validated to the same order. */
export class DuplicateChapterOrderError extends ContentLoaderError {
  bookSlug: string;
  order: number;
  filePaths: string[];

  constructor(bookSlug: string, order: number, filePaths: string[]) {
    super(
      `Duplicate chapter order (${order}) within book "${bookSlug}" found in multiple files:\n` +
        filePaths.map((f) => `  - ${f}`).join("\n")
    );
    this.bookSlug = bookSlug;
    this.order = order;
    this.filePaths = filePaths;
  }
}
