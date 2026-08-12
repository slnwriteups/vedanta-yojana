/**
 * Site-wide, non-content configuration -- Phase 5N. Deliberately separate
 * from content-lib/** (the migrated-content type/access layer): this is
 * application infrastructure (name, description, deployment origin), not
 * anything derived from a content record.
 */

export const SITE_NAME = "Vedanta Yojana";

export const SITE_DESCRIPTION =
  "A developing reference for the 108 Divya Desams and related Vaishnava teachings.";

/**
 * No production domain has been established for this project -- no env
 * var, no vercel.json, no deployment config exists anywhere in the repo
 * as of Phase 5N. Returns undefined rather than fabricating one; callers
 * MUST handle the undefined case explicitly (a relative URL, or an
 * omitted field) instead of silently defaulting to a made-up domain.
 *
 * Once a real origin is configured by setting NEXT_PUBLIC_SITE_URL at
 * deploy time, metadataBase / canonical resolution / the sitemap /
 * robots.txt's Sitemap: line all become fully absolute automatically --
 * no further code changes needed anywhere that calls this function.
 */
export function getSiteOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}
