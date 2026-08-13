/**
 * Phase 6B -- the Home screen's navigation destinations, as plain data
 * rather than inlined JSX, so it can be unit-tested under `node --test`
 * without importing any react-native component (the loader test file
 * establishes the same pattern in Phase 6A).
 *
 * Phase 6C adds `description`: the exact same static, generic copy the
 * web reference app already uses on each section's own index page
 * (app/divya-desams/page.tsx, app/library/page.tsx, etc.) -- reused
 * verbatim for consistency between the two apps, not new fabricated
 * "featured content".
 */
export interface HomeSection {
  label: string;
  route: string;
  description: string;
}

export const HOME_SECTIONS: HomeSection[] = [
  {
    label: "Divya Desams",
    route: "/divya-desams",
    description: "The 108 sacred abodes of Vishnu venerated by the Alwars.",
  },
  {
    label: "Library",
    route: "/library",
    description: "Recovered books, presented chapter by chapter.",
  },
  {
    label: "Knowledge",
    route: "/knowledge",
    description: "Supporting philosophical and devotional material.",
  },
  {
    label: "Search",
    route: "/search",
    description: "Search across Divya Desams, the Library, and Knowledge.",
  },
];
