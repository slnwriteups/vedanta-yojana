'use strict';
/**
 * Phase 3L.
 *
 * Consolidates every unresolved/ambiguous/anomalous item found anywhere in
 * this extraction pipeline into a single content-extraction/unresolved.json.
 * Nothing here is "fixed" -- each entry states what was found, why it is
 * unresolved, what evidence exists, and what further investigation would
 * require (per the task's explicit instruction not to resolve uncertainty by
 * guessing).
 */

const fs = require('fs');
const path = require('path');

const GEN_DIR = path.join(__dirname, '..', '_generated');
const OUT_DIR = path.join(__dirname, '..');

function readJsonIfExists(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

function main() {
  const appDefinition = readJsonIfExists(path.join(GEN_DIR, 'app-definition.json'));
  const classificationUnresolved = readJsonIfExists(path.join(GEN_DIR, 'unresolved-from-classification.json')) || [];
  const imageMap = readJsonIfExists(path.join(OUT_DIR, 'image-map.json'));
  const navigationMap = readJsonIfExists(path.join(OUT_DIR, 'navigation-map.json'));
  const pageInventoryParseFailures = readJsonIfExists(path.join(GEN_DIR, 'page-inventory-parse-failures.json')) || [];

  const entries = [];

  // --- Page117 ---
  const hasPage117InScreens = !!(appDefinition && appDefinition.screens && appDefinition.screens['page.Page117']);
  const hasPage117InNavList = !!(navigationMap && navigationMap.screensListFromSourceNavConfig || []).includes && (navigationMap.screensListFromSourceNavConfig || []).includes('page.Page117');
  entries.push({
    id: 'page.Page117',
    type: 'missing_page',
    whatWasFound:
      'page.Page117 does not exist anywhere in the source app definition: it is ' +
      'absent from appDefinition.screens (found=' + hasPage117InScreens + ') and absent ' +
      'from appDefinition.navigation.screens (found=' + hasPage117InNavList + '). Page numbering ' +
      'goes ...Page116, Page118... with no gap-filler or tombstone record.',
    whyUnresolved:
      'The source application itself has no record of this page ever existing under ' +
      'this pipeline\'s parsing. It cannot be determined from this bundle alone whether ' +
      'it was deleted during development, never created, or renumbered.',
    evidence: 'appDefinition.screens keys (171 total, verified in content-extraction/_generated/app-definition.json); appDefinition.navigation.screens array.',
    furtherInvestigationNeeded: 'Check SAP Build Apps project history/version control (if account access exists) for a deleted Page117.',
  });

  // --- Page0 ---
  entries.push({
    id: 'page.Page0',
    type: 'unclear_purpose',
    whatWasFound:
      'page.Page0 exists with title "Global canvas" and isGlobalCanvas: true. It has ' +
      'a single onPageDidMount event and one root component. AppGyver/SAP Build Apps\' ' +
      '"global canvas" is a known platform concept for globally-available UI (e.g. ' +
      'shared overlays/modals), but this extraction did not further decode what, if ' +
      'anything, actually renders from it at runtime.',
    whyUnresolved: 'Determining its rendered behavior requires either live-rendering the app in a browser or decoding the flow logic behind its onPageDidMount event (id 7265ca8.3943c9a), which was out of scope for content recovery.',
    evidence: 'content-extraction/divya-desams (n/a) -- see content-extraction/_generated/app-definition.json screens["page.Page0"].',
    furtherInvestigationNeeded: 'Live-render the app in a browser and observe global-canvas behavior, or decode flow event 7265ca8.3943c9a.',
  });

  // --- classification-based unresolved (Page93, Page150, Page112/115/116 unknown, placeholder-content pages) ---
  for (const u of classificationUnresolved) {
    entries.push({
      id: u.pageId,
      type: 'classification_' + u.category,
      title: u.title,
      whatWasFound: u.reason,
      whyUnresolved: 'See content-extraction/scripts/05-classify-and-emit-records.js for the exact rule set and evidence fields recorded for this page.',
      evidence: 'content-extraction/page-inventory.json, content-extraction/_generated/classification-summary.json',
      furtherInvestigationNeeded: u.category === 'unresolved_possible_divya_desam'
        ? 'Human review of the actual temple/content vs. the ambiguous structural signal.'
        : (u.title && u.reason.includes('placeholder')
          ? 'This page\'s content was apparently never finished in the source SAP Build Apps project; the real content (if it exists) is not recoverable from this bundle.'
          : 'Confirm via the live app or original author whether this page has real content that this extraction failed to detect, or was simply left empty.'),
    });
  }

  // --- navigation hub list gaps: pages inside the contiguous Divya Desam page-number range that are NOT reachable from the 108-Divyadesam list, even though they were still classified as divya_desam_candidate via the maps-link OR-condition ---
  if (navigationMap) {
    const hubEdges = navigationMap.internalPageNavigationEdges.edges.filter((e) => e.fromPageId === 'page.Page3');
    const hubTargets = new Set(hubEdges.map((e) => e.toPageId));
    const divyaDesamIndex = readJsonIfExists(path.join(OUT_DIR, 'divya-desams', 'index.json'));
    if (divyaDesamIndex) {
      const highConfidenceIds = divyaDesamIndex.entries.filter((e) => e.category === 'divya_desam_candidate').map((e) => e.pageId);
      const missingFromHub = highConfidenceIds.filter((pid) => pid !== 'page.Page4' && !hubTargets.has(pid) && pid !== 'page.Page110' && pid !== 'page.Page111');
      if (missingFromHub.length) {
        entries.push({
          id: 'navigation-hub-gaps',
          type: 'structural_anomaly',
          whatWasFound:
            'The following pages were classified as divya_desam_candidate (via prapatti PDF ' +
            'link + Google Maps link) but are NOT present among page.Page3\'s ("108 Divyadesam") ' +
            '105 "Open page" list-navigation targets, meaning a user browsing the in-app list ' +
            'would not reach them by scrolling it: ' + missingFromHub.join(', '),
          whyUnresolved: 'Cannot determine from the bundle alone whether this is an intentional omission, a data-entry gap in the original app, or reachable via some other in-app path not captured by this extraction (e.g. a "next/previous" button chain between temple pages was not decoded).',
          evidence: 'content-extraction/navigation-map.json (internalPageNavigationEdges, page.Page3 edges)',
          furtherInvestigationNeeded: 'Check the live app for alternate navigation paths to these pages (e.g. sequential next/prev), or treat as a known gap to fix in the new application.',
        });
      }
    }
  }

  // --- image anomalies ---
  if (imageMap) {
    if (imageMap.duplicateGroups.length) {
      entries.push({
        id: 'image-duplicates',
        type: 'duplicate_asset',
        whatWasFound: imageMap.duplicateGroups.length + ' group(s) of byte-identical images stored under different asset UUIDs: ' + JSON.stringify(imageMap.duplicateGroups),
        whyUnresolved: 'The source asset registry treats these as distinct assets (different UUIDs, possibly different original names/upload dates); this extraction preserves that distinction rather than merging them.',
        evidence: 'content-extraction/image-map.json (duplicateGroups)',
        furtherInvestigationNeeded: 'Decide during content modeling whether to de-duplicate these images in the new application.',
      });
    }
    if (imageMap.extensionMismatches.length) {
      entries.push({
        id: 'image-extension-mismatches',
        type: 'mislabeled_asset',
        whatWasFound: imageMap.extensionMismatches.length + ' local image file(s) whose actual (magic-byte-sniffed) format does not match their file extension: ' + JSON.stringify(imageMap.extensionMismatches),
        whyUnresolved: 'The original file was not renamed/modified by this extraction per the task\'s safety rules; the mismatch is reported, not corrected.',
        evidence: 'content-extraction/image-map.json (extensionMismatches)',
        furtherInvestigationNeeded: 'Re-encode or re-extension the affected file when the new application is built, if it causes rendering issues.',
      });
    }
  }

  // --- parse failures ---
  if (pageInventoryParseFailures.length) {
    entries.push({
      id: 'page-content-parse-failures',
      type: 'parse_failure',
      whatWasFound: pageInventoryParseFailures.length + ' page(s) whose component tree could not be fully walked: ' + JSON.stringify(pageInventoryParseFailures),
      whyUnresolved: 'See content-extraction/_generated/page-inventory-parse-failures.json for the specific error per page.',
      evidence: 'content-extraction/_generated/page-inventory-parse-failures.json',
      furtherInvestigationNeeded: 'Debug the walkScreenComponents() call for the affected page id(s) in lib/walk-components.js.',
    });
  } else {
    entries.push({
      id: 'page-content-parse-failures',
      type: 'validation_note',
      whatWasFound: 'No page failed to parse: all 171 screens\' component trees were walked successfully.',
      whyUnresolved: 'N/A -- included for completeness of the validation record.',
      evidence: 'content-extraction/_generated/page-content.json',
      furtherInvestigationNeeded: 'None.',
    });
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'unresolved.json'),
    JSON.stringify({ count: entries.length, entries }, null, 2),
    'utf8'
  );
  console.log('[06] Wrote unresolved.json (', entries.length, 'entries )');
}

main();
