# Documentation

## A Brief Insight to Visishtadvaita Philosophy — Translation Project

This book (`content/library/untitled-recovered-book-pending-editorial-title/`,
51 chapters) was translated from English into Tamil, Kannada, and Hindi
directly in-session by Claude, chapter by chapter, under a fixed set of
project rules established by the project owner. This section documents
that process for anyone picking up translation or QC work on this or
future books.

### Source languages

Translations are produced only in **Tamil, Kannada, and Hindi**.
**Telugu is never used** — not as a target language, and not as a script
or transliteration convention bleeding into the other three (Telugu and
Kannada share visually similar independent-vowel-sign Unicode blocks,
which is an easy place for a stray character to slip in un-noticed; see
the cross-book QC note below).

### Shloka and pasuram handling

Sanskrit shlokas, Upanishad mahavakyas, and Tamil pasurams/riddle-verses
quoted inside a chapter body are **never translated line-by-line**.
Instead:

- The verse is **transliterated** into the target script (native Tamil
  script, Kannada script, or Devanagari for Hindi).
- Any accompanying English explanation of the verse's *meaning* is
  translated normally, as prose.
- Sanskrit verses that are already in Devanagari in the English source
  are **left as-is for the Hindi translation** (no re-transliteration
  needed) and only script-converted for Tamil and Kannada.

Example: chapter 51 ("Conclusion") closes with a Thiruppallandu pasuram
(Tamil) and two Sanskrit dedication shlokas — both handled this way
rather than translated.

### Source-integrity corrections

Two chapters had corrupted body text from the original PDF extraction —
literal repeated "Lorem ipsum dolor sit amet" placeholder text instead
of real content (flagged by `migration.needsReview: true`):

- **Chapter 12, `guru-parampara.json`** — corrected by reading the
  source PDF (`source-material/Books/A Brief Insight to Visishtadvaita
  Philosophy.pdf`) directly via `pdftotext -layout` and replacing the
  placeholder with the real (short) intro paragraph before translating.
- **Chapter 47, `charama-shlokams.json`** — same treatment; the real
  content turned out to already be present in the JSON, just followed
  by six junk placeholder paragraphs that were removed.

In both cases the English `body` field was corrected against the source
PDF first, and only then translated — never translated as-is, never
silently skipped.

### Divya Desams as the quality benchmark

The existing Divya Desams content (`content/divya-desams/`) is the
reference standard for what "done" looks like: faithful to source,
natural readable prose (not overly literary or ornate), no invented
explanations, no dropped content. It is a quality bar, not a content
template — this book's structure and voice follow the English source,
not the Divya Desam entries' structure.

### Checkpoint discipline

Chapters were translated and committed in batches of 3, never leaving
more than 3 chapters uncommitted at once. Each chapter had to pass a
13-point QC checklist (translation completeness, source fidelity,
grammar, spelling, punctuation, terminology consistency, transliteration
correctness, shloka/pasuram handling, formatting, natural readability, no
omissions, correct file location, valid JSON) before counting as done.

| Chapters | Status | QC | Commit | Push |
|---|---|---|---|---|
| 1–3 | Done | Passed | `b0ad186` | Success |
| 4–6 | Done | Passed | `548885e` | Success |
| 7–9 | Done | Passed | `1c09468` | Success |
| 10–12 | Done (ch12 source-corrected, see above) | Passed | `f070886` | Success |
| 13–15 | Done | Passed | `c3fb841` | Success |
| 16–18 | Done | Passed | `dedb8b8` | Success |
| 19–21 | Done | Passed | `1928efc` | Success |
| 22–24 | Done | Passed | `aa85873` | Success |
| 25–27 | Done | Passed | `cbec458` | Success |
| 28–30 | Done | Passed | `d4ec11a` | Success |
| 31–33 | Done | Passed | `2a20111` | Success |
| 34–36 | Done | Passed | `ddc8b04` | Success |
| 37–39 | Done | Passed | `4724398` | Success |
| 40–42 | Done | Passed | `0cbc5df` | Success |
| 43–45 | Done | Passed | `0de90b1` | Success |
| 46–48 | Done (ch47 source-corrected, see above) | Passed | `60f01da` | Success |
| 49–51 | Done (book complete) | Passed | `d7ec1cc` | Success |
| Book-level review fix | Cleared stale `needsReview` flag on ch12 | Passed | `46deb88` | Success |

### Full book-level review (after chapter 51)

A dedicated pass across all 51 chapters checked: no remaining Lorem
Ipsum/placeholder text, no stale `needsReview` flags, no duplicated
translation passages between chapters, and no gloss-duplication bugs
(the "word (Sanskrit gloss)" self-duplication pattern — see below). One
stale metadata flag was found and cleared (`46deb88`); everything else
passed clean.

### Cross-book QC pass (after this book)

A terminology/transliteration consistency pass was run across all 5
translated library items — JAYA, Sri Rama Charithram, Srimad Bhagavata
Kathasagaram, Divya Desams, and this book — 265 chapter/entry files in
total. Findings:

- **One stray Telugu-script character** found and fixed: a Kannada word
  in `content/divya-desams/tirupperai.json` contained a Telugu vowel
  sign (U+0C48) instead of the correct Kannada vowel sign (U+0CC8).
  Fixed in `7f681e5`. No other Telugu-script leaks found anywhere else
  in the corpus.
- **Tamil "moksham" spelling varies** between மோக்ஷம் (Sanskritized) and
  மோட்சம் (native Tamil phonetic form) across JAYA, Srimad Bhagavata
  Kathasagaram, Divya Desams, and this book — mixed within books, not
  cleanly split by book. Both are legitimate, commonly interchangeable
  forms in Tamil religious writing. Reviewed with the project owner and
  **left as-is** — treated as acceptable natural variation, not an
  error, given the scale of a corpus-wide rewrite (150+ occurrences
  across already-published books) versus the marginal benefit.

### Known translation pitfall: gloss duplication

A prior bug pattern to watch for: a phrase like "word (Sanskrit gloss)"
in the English source can get mistranslated as a nonsensical
self-duplicate (translated word followed by the same translated word in
parentheses, instead of the translated word followed by the
*transliterated* Sanskrit term). Checked mechanically after every
translation via the regex `(\S+)\s*\(\s*\1\s*\)` against the translated
body — zero hits across this entire book.

### Project context

This is the project owner's first AI-assisted app development project.
The checkpoint/QC/reporting discipline above exists specifically to keep
a large, multi-language translation effort verifiable and reversible in
small increments, rather than trusting a single large unreviewed batch.
