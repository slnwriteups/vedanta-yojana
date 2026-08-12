'use strict';
/**
 * Phase 3D + supporting data for 3E/3F.
 *
 * Reads _generated/app-definition.json (produced by 01-extract-app-definition.js)
 * and, for every screen (page) defined in the source:
 *   - resolves its full component tree in source order (see lib/walk-components.js)
 *   - records structural facts (does it have text/images/buttons/icons, how many,
 *     whether any text block is literally "Lorem ipsum" placeholder content)
 *   - records every ag-asset://<uuid> image reference found on the page
 *   - cross-references logic.flows for any "Open URL" actions whose pageId
 *     matches this page (external PDF / maps / other links), see 04 for the
 *     canonical resources extraction -- here we only record counts + refs.
 *
 * Writes:
 *   - content-extraction/page-inventory.json      (per-page structural facts, no editorializing)
 *   - content-extraction/_generated/page-content.json (full ordered content blocks per page,
 *       reused by 05-classify-and-emit-records.js so the tree is only walked once)
 *
 * IMPORTANT: this script does NOT classify pages as "Divya Desam" vs "article".
 * It only records what is structurally present. Classification (with its
 * explicit, documented evidence rules) happens in 05-classify-and-emit-records.js.
 */

const fs = require('fs');
const path = require('path');
const { walkScreenComponents } = require('./lib/walk-components');

const GEN_DIR = path.join(__dirname, '..', '_generated');
const OUT_DIR = path.join(__dirname, '..');

function main() {
  const appDefinitionPath = path.join(GEN_DIR, 'app-definition.json');
  if (!fs.existsSync(appDefinitionPath)) {
    console.error('FATAL: run 01-extract-app-definition.js first (missing', appDefinitionPath, ')');
    process.exit(1);
  }
  const appDefinition = JSON.parse(fs.readFileSync(appDefinitionPath, 'utf8'));

  // Build pageId -> [flow, ...] index once (flows self-report their pageId).
  const flowsByPage = {};
  for (const [flowId, flow] of Object.entries(appDefinition.logic.flows || {})) {
    const pid = flow.pageId;
    if (!pid) continue;
    (flowsByPage[pid] = flowsByPage[pid] || []).push({ flowId, flow });
  }

  const pageIds = Object.keys(appDefinition.screens).sort((a, b) => {
    const na = parseInt(a.replace('page.Page', ''), 10);
    const nb = parseInt(b.replace('page.Page', ''), 10);
    return na - nb;
  });

  const inventory = [];
  const pageContent = {};
  const parseFailures = [];

  for (const pageId of pageIds) {
    let blocks;
    try {
      blocks = walkScreenComponents(appDefinition, pageId);
    } catch (e) {
      parseFailures.push({ pageId, error: e.message });
      blocks = [];
    }
    pageContent[pageId] = blocks;

    const screen = appDefinition.screens[pageId];

    const counts = { total: 0, text: 0, button: 0, picture: 0, icon: 0, layout: 0, view: 0, other: 0 };
    const imageAssetRefs = [];
    let placeholderTextBlockCount = 0;
    const placeholderNeedle = 'Lorem ipsum';

    for (const b of blocks) {
      counts.total++;
      if (counts[b.type] !== undefined) counts[b.type]++;
      else counts.other++;

      if (b.type === 'text' && typeof b.content === 'string' && b.content.includes(placeholderNeedle)) {
        placeholderTextBlockCount++;
      }
      if (typeof b.src === 'string' && b.src.startsWith('ag-asset://')) {
        imageAssetRefs.push(b.src.replace('ag-asset://', ''));
      }
      if (typeof b.backgroundImage === 'string' && b.backgroundImage.startsWith('ag-asset://')) {
        imageAssetRefs.push(b.backgroundImage.replace('ag-asset://', ''));
      }
    }

    const pageFlows = flowsByPage[pageId] || [];
    let pdfLinkCount = 0;
    let mapsLinkCount = 0;
    let otherExternalLinkCount = 0;
    const externalLinkUrls = [];
    for (const { flow } of pageFlows) {
      for (const node of Object.values(flow.nodes || {})) {
        if (node.title === 'Open URL') {
          const url = node.inputs && node.inputs.url && node.inputs.url.key;
          if (typeof url !== 'string') continue;
          externalLinkUrls.push(url);
          const lower = url.toLowerCase();
          if (lower.includes('prapatti.com')) pdfLinkCount++;
          else if (lower.includes('maps.app.goo.gl') || lower.includes('google.com/maps')) mapsLinkCount++;
          else otherExternalLinkCount++;
        }
      }
    }

    inventory.push({
      pageId,
      title: screen.title !== undefined ? screen.title : null,
      pageFlowId: screen.pageFlowId !== undefined ? screen.pageFlowId : null,
      isGlobalCanvas: !!screen.isGlobalCanvas,
      sourceLocation: {
        screensKey: pageId,
        appDefinitionFile: 'content-extraction/_generated/app-definition.json',
      },
      componentCounts: counts,
      hasText: counts.text > 0,
      hasImages: counts.picture > 0,
      hasButtons: counts.button > 0,
      hasIcons: counts.icon > 0,
      containsPlaceholderText: placeholderTextBlockCount > 0,
      placeholderTextBlockCount,
      imageAssetRefs: Array.from(new Set(imageAssetRefs)),
      externalLinks: {
        pdfLinkCount,
        mapsLinkCount,
        otherExternalLinkCount,
        totalCount: externalLinkUrls.length,
      },
      // Presence of child/navigation-triggering actions: any button on this
      // page whose tap event fires a flow at all (regardless of what that
      // flow does). This does not attempt to resolve *where* it navigates to
      // -- see navigation-map.json / 04 for the best-effort attempt at that.
      hasFlowTriggeringComponents: pageFlows.length > 0,
      flowCount: pageFlows.length,
    });
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'page-inventory.json'),
    JSON.stringify({ pageCount: inventory.length, pages: inventory }, null, 2),
    'utf8'
  );
  console.log('[02] Wrote page-inventory.json (', inventory.length, 'pages )');

  fs.writeFileSync(
    path.join(GEN_DIR, 'page-content.json'),
    JSON.stringify(pageContent, null, 2),
    'utf8'
  );
  console.log('[02] Wrote _generated/page-content.json');

  if (parseFailures.length) {
    fs.writeFileSync(
      path.join(GEN_DIR, 'page-inventory-parse-failures.json'),
      JSON.stringify(parseFailures, null, 2),
      'utf8'
    );
    console.warn('[02] WARNING:', parseFailures.length, 'page(s) failed to parse -- see _generated/page-inventory-parse-failures.json');
  } else {
    console.log('[02] No parse failures.');
  }
}

main();
