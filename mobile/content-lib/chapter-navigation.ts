import type { Chapter } from "./loader.ts";

/**
 * Phase 6D -- pure previous/next lookup over an already-loaded,
 * already-ordered chapter list (loadChapters() already returns chapters
 * ascending by their own `order` field -- this never re-sorts). Kept
 * separate from the screen so it's testable under `node --test` without
 * a react-native renderer.
 */
export interface AdjacentChapters {
  previous: Chapter | null;
  next: Chapter | null;
}

export function findAdjacentChapters(chapters: Chapter[], currentSlug: string): AdjacentChapters {
  const index = chapters.findIndex((chapter) => chapter.slug === currentSlug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: index > 0 ? chapters[index - 1] : null,
    next: index < chapters.length - 1 ? chapters[index + 1] : null,
  };
}
