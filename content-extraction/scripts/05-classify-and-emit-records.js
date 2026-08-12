'use strict';
/**
 * Phase 3E + 3F.
 *
 * Classifies each of the 171 source pages using ONLY explicit, documented,
 * inspectable structural evidence -- never page numbering, and never title
 * text alone. Every record carries an `evidence` object so the classification
 * is auditable, not asserted.
 *
 * Classification rules, applied in order (first match wins):
 *
 *   1. system_global_canvas
 *        screen.isGlobalCanvas === true
 *        (Currently only page.Page0. AppGyver's "global canvas" concept --
 *         its actual runtime purpose beyond that flag is NOT determined by
 *         this extraction; see unresolved.json.)
 *
 *   2. app_chrome
 *        page title exactly matches a title in the app's own
 *        navigation.mobile.tabs[].title list (i.e. it's one of the app's
 *        declared top-level tabs -- Welcome/Home and Menu).
 *
 *   3. navigation_hub
 *        the page is the SOURCE of >= HUB_EDGE_THRESHOLD internal "Open page"
 *        navigation edges (i.e. it functions as an index/list linking out to
 *        many other pages). Threshold chosen well below the observed 105
 *        edges on the one page that has this shape, and far above the
 *        handful of edges normal content pages have, so it is not fitted to
 *        a specific page id.
 *
 *   4. divya_desam_candidate
 *        the page has >=1 confirmed "Open URL" action to a prapatti.com
 *        sloka PDF, AND (it also has >=1 "Open URL" action to a Google Maps
 *        location OR it is a navigation target of a navigation_hub page).
 *        This combination was verified during investigation to reliably
 *        separate the 107 real Divya Desam temple pages from a false-positive
 *        (a stotram page that also happens to link a prapatti.com PDF but is
 *        neither map-linked nor reachable from the hub list).
 *
 *   5. unresolved_possible_divya_desam
 *        has a prapatti.com PDF link but fails rule 4's second condition --
 *        i.e. genuinely ambiguous by the available structural evidence.
 *        Written into divya-desams/ WITH a lower confidence flag, and also
 *        listed in unresolved.json, rather than silently dropped or silently
 *        promoted.
 *
 *   6. non_temple_content_candidate
 *        not covered above, and has at least one real (non-"Lorem ipsum")
 *        text block. Written into articles/. This label is deliberately
 *        neutral (not "article") since the source has no explicit content-type
 *        field distinguishing philosophy/scripture/narrative/etc.
 *
 *   7. unknown
 *        everything else (e.g. pages with no resolvable text/media at all).
 *
 * This script never modifies the original bundle, images, or HTML files. It
 * only reads content-extraction/_generated/*.json (already-extracted,
 * additive files) and writes new files under content-extraction/.
 */

const fs = require('fs');
const path = require('path');

const GEN_DIR = path.join(__dirname, '..', '_generated');
const OUT_DIR = path.join(__dirname, '..');
const HUB_EDGE_THRESHOLD = 50;

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function main() {
  const appDefinition = readJson(path.join(GEN_DIR, 'app-definition.json'));
  const pageContent = readJson(path.join(GEN_DIR, 'page-content.json'));
  const pageInventory = readJson(path.join(OUT_DIR, 'page-inventory.json')).pages;
  const navigationMap = readJson(path.join(OUT_DIR, 'navigation-map.json'));
  const externalLinksData = readJson(path.join(OUT_DIR, 'resources', 'external-links.json'));

  const tabTitles = new Set(
    (navigationMap.tabsFromSourceNavConfig.mobile || []).map((t) => t.title)
  );

  const edgesBySource = {};
  for (const e of navigationMap.internalPageNavigationEdges.edges) {
    (edgesBySource[e.fromPageId] = edgesBySource[e.fromPageId] || []).push(e);
  }
  const hubPageIds = new Set(
    Object.entries(edgesBySource)
      .filter(([, edges]) => edges.length >= HUB_EDGE_THRESHOLD)
      .map(([pid]) => pid)
  );
  const hubTargetPageIds = new Set();
  for (const pid of hubPageIds) {
    for (const e of edgesBySource[pid]) hubTargetPageIds.add(e.toPageId);
  }

  const linksByPage = {};
  for (const l of externalLinksData.links) {
    (linksByPage[l.pageId] = linksByPage[l.pageId] || []).push(l);
  }

  const outEdgesByPage = edgesBySource;

  const divyaDesamDir = path.join(OUT_DIR, 'divya-desams');
  const articlesDir = path.join(OUT_DIR, 'articles');
  fs.mkdirSync(divyaDesamDir, { recursive: true });
  fs.mkdirSync(articlesDir, { recursive: true });

  const classificationSummary = {};
  const divyaDesamIndex = [];
  const articleIndex = [];
  const unresolvedFromClassification = [];

  for (const inv of pageInventory) {
    const pageId = inv.pageId;
    const blocks = pageContent[pageId] || [];
    const pageLinks = linksByPage[pageId] || [];
    const hasPdfLink = pageLinks.some((l) => l.resourceType === 'sloka_pdf_prapatti');
    const hasMapsLink = pageLinks.some((l) => l.resourceType === 'google_maps_location');
    const isHubTarget = hubTargetPageIds.has(pageId);
    const isHub = hubPageIds.has(pageId);
    const hasRealText = blocks.some((b) => b.type === 'text' && typeof b.content === 'string' && b.content.trim().length > 0 && !b.content.includes('Lorem ipsum'));

    let category;
    let evidence = {};

    if (inv.isGlobalCanvas) {
      category = 'system_global_canvas';
      evidence = { isGlobalCanvas: true };
    } else if (tabTitles.has(inv.title)) {
      category = 'app_chrome';
      evidence = { titleMatchesDeclaredTab: inv.title };
    } else if (isHub) {
      category = 'navigation_hub';
      evidence = { outgoingOpenPageEdgeCount: (outEdgesByPage[pageId] || []).length, threshold: HUB_EDGE_THRESHOLD };
    } else if (hasPdfLink && (hasMapsLink || isHubTarget)) {
      category = 'divya_desam_candidate';
      evidence = { hasPrapattiPdfLink: true, hasGoogleMapsLink: hasMapsLink, isNavigationHubTarget: isHubTarget };
    } else if (hasPdfLink) {
      category = 'unresolved_possible_divya_desam';
      evidence = { hasPrapattiPdfLink: true, hasGoogleMapsLink: false, isNavigationHubTarget: false, reason: 'Has a prapatti.com sloka/stotram PDF link, like the confirmed Divya Desam pages, but lacks BOTH a Google Maps link and hub-list membership, so it cannot be confidently distinguished from a non-temple stotram/sloka page using available structural evidence.' };
    } else if (hasRealText) {
      category = 'non_temple_content_candidate';
      evidence = { hasNonPlaceholderText: true, hasPrapattiPdfLink: hasPdfLink, hasGoogleMapsLink: hasMapsLink };
    } else {
      category = 'unknown';
      evidence = { hasNonPlaceholderText: false, componentCounts: inv.componentCounts };
    }

    classificationSummary[category] = (classificationSummary[category] || 0) + 1;

    const record = {
      pageId,
      title: inv.title,
      classification: {
        category,
        evidence,
        confidence: (category === 'divya_desam_candidate' || category === 'app_chrome' || category === 'system_global_canvas' || category === 'navigation_hub') ? 'high' : (category === 'non_temple_content_candidate' ? 'medium' : 'low'),
        method: 'content-extraction/scripts/05-classify-and-emit-records.js -- see header comment for full rule set',
      },
      containsPlaceholderText: inv.containsPlaceholderText,
      placeholderTextBlockCount: inv.placeholderTextBlockCount,
      sourceLocation: inv.sourceLocation,
      imageAssetRefs: inv.imageAssetRefs,
      externalLinks: pageLinks.map((l) => ({ url: l.url, resourceType: l.resourceType, sourceComponentLabel: l.sourceComponentLabel })),
      internalNavigationOutEdges: (outEdgesByPage[pageId] || []).map((e) => ({ toPageId: e.toPageId, sourceComponentLabel: e.sourceComponentLabel })),
      contentBlocks: blocks.map((b) => {
        const out = { order: b.order, depth: b.depth, type: b.type };
        if (b.content !== undefined) out.content = b.content;
        if (b.label !== undefined) out.label = b.label;
        if (b.src !== undefined) out.imageAssetRef = b.src;
        if (b.iconName !== undefined) out.iconName = b.iconName;
        if (b.textFontSizeHint !== undefined) out.textFontSizeHint = b.textFontSizeHint;
        return out;
      }),
    };

    if (category === 'divya_desam_candidate' || category === 'unresolved_possible_divya_desam') {
      fs.writeFileSync(path.join(divyaDesamDir, pageId + '.json'), JSON.stringify(record, null, 2), 'utf8');
      divyaDesamIndex.push({ pageId, title: inv.title, category, confidence: record.classification.confidence });
    } else if (category === 'non_temple_content_candidate') {
      fs.writeFileSync(path.join(articlesDir, pageId + '.json'), JSON.stringify(record, null, 2), 'utf8');
      articleIndex.push({ pageId, title: inv.title, category, confidence: record.classification.confidence });
    }

    if (category === 'unresolved_possible_divya_desam' || category === 'unknown' || inv.containsPlaceholderText || category === 'system_global_canvas') {
      unresolvedFromClassification.push({
        pageId,
        title: inv.title,
        category,
        reason: category === 'unresolved_possible_divya_desam' ? evidence.reason
          : category === 'unknown' ? 'No confident classification rule matched and no non-placeholder text was found.'
          : inv.containsPlaceholderText ? ('Page contains ' + inv.placeholderTextBlockCount + ' "Lorem ipsum" placeholder text block(s); content appears unfinished in the source application.')
          : 'Global canvas page; its functional purpose beyond the isGlobalCanvas flag was not determined by this extraction.',
      });
    }
  }

  fs.writeFileSync(path.join(divyaDesamDir, 'index.json'), JSON.stringify({ count: divyaDesamIndex.length, entries: divyaDesamIndex }, null, 2), 'utf8');
  fs.writeFileSync(path.join(articlesDir, 'index.json'), JSON.stringify({ count: articleIndex.length, entries: articleIndex }, null, 2), 'utf8');

  fs.writeFileSync(
    path.join(GEN_DIR, 'classification-summary.json'),
    JSON.stringify({ hubEdgeThreshold: HUB_EDGE_THRESHOLD, hubPageIds: Array.from(hubPageIds), byCategory: classificationSummary }, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(GEN_DIR, 'unresolved-from-classification.json'),
    JSON.stringify(unresolvedFromClassification, null, 2),
    'utf8'
  );

  console.log('[05] Classification summary:', classificationSummary);
  console.log('[05] Wrote', divyaDesamIndex.length, 'divya-desams/*.json records +index.json');
  console.log('[05] Wrote', articleIndex.length, 'articles/*.json records + index.json');
  console.log('[05] Flagged', unresolvedFromClassification.length, 'pages for unresolved.json (script 06)');
}

main();
