import Link from "next/link";
import type { Chapter } from "@/content-lib/schemas";

/**
 * One row of a Book's chapter list. Title and link only -- no
 * description/summary field exists on Chapter to safely show without
 * fabrication, and no icon/decoration is added per the restrained visual
 * language established in Phase 5J/5K.
 */
export function ChapterListItem({
  bookSlug,
  chapter,
}: {
  bookSlug: string;
  chapter: Chapter;
}) {
  return (
    <li className="py-3">
      <Link href={`/library/${bookSlug}/${chapter.slug}`} className="hover:underline">
        {chapter.title}
      </Link>
    </li>
  );
}
