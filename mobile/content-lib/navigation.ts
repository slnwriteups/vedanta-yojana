/**
 * Phase 6B -- the Home screen's navigation destinations, as plain data
 * rather than inlined JSX, so it can be unit-tested under `node --test`
 * without importing any react-native component (the loader test file
 * establishes the same pattern in Phase 6A).
 */
export interface HomeSection {
  label: string;
  route: string;
}

export const HOME_SECTIONS: HomeSection[] = [
  { label: "Divya Desams", route: "/divya-desams" },
  { label: "Library", route: "/library" },
  { label: "Knowledge", route: "/knowledge" },
  { label: "Search", route: "/search" },
];
