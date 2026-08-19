/**
 * Presentation-only long-paragraph splitting, shared by web
 * (components/shared/LongFormSection.tsx) and mobile
 * (mobile/components/Section.tsx). Several source paragraphs (an entire
 * Sthala Puranam narrative episode, e.g.) arrive as one multi-thousand-
 * character block with no internal blank-line break at all -- reported
 * as reading like a dense wall of text ("looks like Wikipedia").
 *
 * This NEVER touches the stored content: `splitIntoReadableParagraphs`
 * is a pure function that decides where the RENDERER inserts an extra
 * paragraph break, always at an existing sentence boundary already
 * present in the text -- concatenating its output with single spaces
 * reconstructs the original paragraph exactly (modulo the run of
 * whitespace the original sentence-boundary already had). It is never
 * used to summarize, reword, or truncate anything, and a paragraph that
 * already reads comfortably (at or under the target length) is returned
 * completely untouched, as a single-element array.
 *
 * A single `\n` is just as much an author-authored break as a blank
 * line: much of the corpus stores one paragraph (or list item) per
 * line rather than separating paragraphs with a blank line, so
 * `paragraphsForReading` treats every run of one or more newlines as a
 * real paragraph break. Earlier this only honored `\n{2,}`, so a block
 * whose internal breaks were single `\n` was handled as one giant
 * paragraph and, once over the length target, resplit at sentence
 * boundaries and rejoined with a plain space -- silently erasing the
 * original line breaks (visible e.g. in an "(i)/(ii)/(iii)" list that
 * collapsed onto one run-on line).
 */

/**
 * Sentence-terminal punctuation, Latin and Devanagari both -- the
 * corpus's own Sanskrit/Hindi shloka passages (srimad-bhagavatham,
 * conclusion) end sentences with "।" (danda) or "॥" (double danda), not
 * ".", so a Latin-only boundary would leave those paragraphs unsplit.
 */
const SENTENCE_BOUNDARY = /(?<=[.!?।॥])\s+(?=\S)/g;

/** Below this length, a paragraph already reads fine -- split it and it looks choppy instead of readable. */
const DEFAULT_TARGET_LENGTH = 550;

/**
 * Greedily groups consecutive sentences from `paragraph` into chunks no
 * longer than `targetLength` where possible. A single sentence longer
 * than `targetLength` on its own is still returned whole -- this only
 * ever adds break points at existing sentence boundaries, never inside
 * one.
 */
export function splitIntoReadableParagraphs(
  paragraph: string,
  targetLength: number = DEFAULT_TARGET_LENGTH
): string[] {
  const trimmed = paragraph.trim();
  if (trimmed.length <= targetLength) return [trimmed];

  const sentences = trimmed.split(SENTENCE_BOUNDARY).filter((s) => s.length > 0);
  if (sentences.length <= 1) return [trimmed];

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current && current.length + 1 + sentence.length > targetLength) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

/**
 * Splits `text` on its own existing newline paragraph breaks first --
 * a single `\n` and a blank line are both real, source-authored
 * structure and are honored equally -- then applies
 * splitIntoReadableParagraphs to any resulting block that's still too
 * long to read comfortably as one paragraph.
 */
export function paragraphsForReading(text: string, targetLength: number = DEFAULT_TARGET_LENGTH): string[] {
  return text
    .split(/\n+/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .flatMap((block) => splitIntoReadableParagraphs(block, targetLength));
}
