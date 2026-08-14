# Follow-up: entry start-page anchored on the wrong line

Generated in response to: "Tirumeyam there is image bleed from the next entry" /
"There is image bleed in singavelkundram towards the very end as well" / "I just
checked the source document and there are clear page breaks between consecutive
entries, there should be no reason why there should be any image or text bleed
if the source is being used faithfully."

## Root cause

`scripts/source-material/divyadesam-entries.ts` computed each book entry's
`startPage` from the page containing its **"Details of Kshethram:" marker
line**, not the page containing the entry's own **title line**. In the large
majority of the 108 entries these are the same page, but in 6 entries the
marker sits one page after the title (a page-number footer line, or the title
plus its own opening photo, pushes the "Details of Kshethram:" block to the
following page). Anchoring on the marker made the *preceding* entry's
`[startPage, nextStartPage)` image range wrongly swallow the following entry's
own title-page photo(s), since that page still fell inside the previous
entry's computed range.

Confirmed by direct inspection of the source PDF text (`pdftotext -layout`):
every one of the 6 mismatches is a real page break, exactly as the user
described -- the bug was in how this tooling read the page break, not in the
source itself.

## Fix

`startPage` now anchors on the title line's own page (`findTitleAboveIndex`),
matching the entry's true first printed page. A markerless boundary is
unaffected (it already IS the title line).

## Live-data corrections applied

Two of the six affected entries had already-migrated content still showing the
old, wrong page range (the other four were independently caught and
self-corrected by the existing cross-record duplicate-image fix in an earlier
phase, because the correct record already had a matching original SAP photo to
dedupe against -- see `phase-6E-cross-record-duplicates-report.md`). These two
had no such matching duplicate, so nothing caught them until this direct
boundary-range audit:

| Removed from | Removed image | Belongs to (moved there) | Source page |
|---|---|---|---|
| tirumayam | tirumayam-book-6 | tiruayodhi-ayodhya (as tiruayodhi-ayodhya-book-8) | 293 |
| singavelkundram-ahobilam | singavelkundram-ahobilam-book-29 | tiruvenkatam (as tiruvenkatam-book-5) | 338 |
| singavelkundram-ahobilam | singavelkundram-ahobilam-book-30 | tiruvenkatam (as tiruvenkatam-book-6) | 338 |
| singavelkundram-ahobilam | singavelkundram-ahobilam-book-31 | tiruvenkatam (as tiruvenkatam-book-7) | 338 |

Verified via an exhaustive cross-check: every book-sourced image's provenance
`sourcePage` now falls within its own record's corrected page range, across
all 108 entries -- zero remaining mismatches. Also verified via perceptual
RMSE that none of the 4 moved images are near-duplicates of anything already
in their new record (all RMSE > 0.23, far above the 0.10 duplicate
threshold) -- these are genuinely distinct photos, not redundant reprints.

## A related false lead, corrected before landing

While investigating, a second hypothesis was tested and found wrong: that
short, isolated lines like "Varaha Swamy" or "Sri Andal Nachiyar" sitting
alone between paragraphs in several records' `sthalaPuranam` text were
picture-caption "text bleed." They are not -- they are the deliberate
`placementAnchor` sub-headings the image-positioning feature (from an earlier
phase, `scripts/source-material/image-placement.ts`) depends on to place a
photo next to the specific named section it illustrates. An initial pass
stripped 16 such lines from 10 records; this was reverted in full before
being applied, after cross-checking against every record's stored
`placementAnchor` values and confirming several of the 16 are actively
load-bearing anchors, and the rest match the exact same source-faithful
heading pattern (also confirmed present, unflagged, in the Library book's
chapter bodies). No caption/anchor text was removed from any record.
