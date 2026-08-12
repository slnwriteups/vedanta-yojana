'use strict';
/**
 * Phase 3H (external resources) + Phase 3I (navigation/relationships).
 *
 * Source of truth: appDefinition.logic.flows. Every flow object in this
 * dictionary self-reports the pageId it belongs to and a contextId that
 * names the owning component (e.g. "page:150:component:ec28107b-...").
 * Two flow-function node titles were confirmed during investigation:
 *   - "Open URL"  -> inputs.url.key  (external link target)
 *   - "Open page" -> inputs.page.key (internal navigation target, a pageId)
 * These were found by exhaustively scanning every node in every flow, not
 * assumed from a subset.
 *
 * Writes:
 *   - content-extraction/resources/external-links.json
 *   - content-extraction/navigation-map.json
 */

const fs = require('fs');
const path = require('path');

const GEN_DIR = path.join(__dirname, '..', '_generated');
const OUT_DIR = path.join(__dirname, '..');

function classifyUrl(url) {
  let hostname = 'UNPARSEABLE';
  try { hostname = new URL(url).hostname; } catch (e) { /* leave UNPARSEABLE */ }
  const lower = url.toLowerCase();
  let resourceType = 'other';
  if (lower.includes('prapatti.com')) resourceType = 'sloka_pdf_prapatti';
  else if (hostname.includes('maps.app.goo.gl') || hostname.includes('google.com') && lower.includes('/maps')) resourceType = 'google_maps_location';
  return { hostname, resourceType };
}

function main() {
  const appDefinition = JSON.parse(fs.readFileSync(path.join(GEN_DIR, 'app-definition.json'), 'utf8'));
  const components = appDefinition.components;
  const flows = appDefinition.logic.flows || {};

  const externalLinks = [];
  const internalNavEdges = [];
  const otherFlowActionTitles = new Set();

  for (const [flowId, flow] of Object.entries(flows)) {
    const pageId = flow.pageId || null;
    let ownerComponentId = null;
    if (typeof flow.contextId === 'string') {
      const m = flow.contextId.match(/component:([0-9a-fA-F-]+)$/);
      if (m) ownerComponentId = m[1];
    }
    const ownerComponent = ownerComponentId ? components[ownerComponentId] : null;
    const ownerLabel = ownerComponent && ownerComponent.props
      ? (ownerComponent.props.label !== undefined ? ownerComponent.props.label
        : (ownerComponent.props.content !== undefined ? ownerComponent.props.content : null))
      : null;

    for (const [nodeId, node] of Object.entries(flow.nodes || {})) {
      if (node.title === 'Open URL') {
        const url = node.inputs && node.inputs.url && node.inputs.url.key;
        const urlSource = node.inputs && node.inputs.url && node.inputs.url.source;
        if (typeof url !== 'string') {
          otherFlowActionTitles.add('Open URL (non-string/dynamic url, source=' + urlSource + ')');
          continue;
        }
        const { hostname, resourceType } = classifyUrl(url);
        externalLinks.push({
          url,
          hostname,
          resourceType,
          pageId,
          flowId,
          nodeId,
          flowTitle: flow.title || null,
          sourceComponentId: ownerComponentId,
          sourceComponentLabel: ownerLabel,
        });
      } else if (node.title === 'Open page') {
        const targetPageId = node.inputs && node.inputs.page && node.inputs.page.key;
        const targetSource = node.inputs && node.inputs.page && node.inputs.page.source;
        if (typeof targetPageId !== 'string') {
          otherFlowActionTitles.add('Open page (non-string/dynamic target, source=' + targetSource + ')');
          continue;
        }
        internalNavEdges.push({
          fromPageId: pageId,
          toPageId: targetPageId,
          targetExistsAsScreen: !!appDefinition.screens[targetPageId],
          flowId,
          nodeId,
          flowTitle: flow.title || null,
          sourceComponentId: ownerComponentId,
          sourceComponentLabel: ownerLabel,
        });
      } else if (node.type === 'function' && node.title) {
        otherFlowActionTitles.add(node.title);
      }
    }
  }

  // Duplicate URL detection (same URL string used in more than one flow).
  const urlCounts = {};
  for (const l of externalLinks) urlCounts[l.url] = (urlCounts[l.url] || 0) + 1;
  for (const l of externalLinks) l.duplicateUsageCount = urlCounts[l.url];

  const resourcesOut = {
    summary: {
      totalExternalLinkActions: externalLinks.length,
      byResourceType: externalLinks.reduce((acc, l) => { acc[l.resourceType] = (acc[l.resourceType] || 0) + 1; return acc; }, {}),
      distinctUrls: Object.keys(urlCounts).length,
      urlsUsedMoreThanOnce: Object.values(urlCounts).filter((c) => c > 1).length,
      distinctPagesWithExternalLinks: new Set(externalLinks.map((l) => l.pageId)).size,
    },
    links: externalLinks,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'resources', 'external-links.json'), JSON.stringify(resourcesOut, null, 2), 'utf8');
  console.log('[04] Wrote resources/external-links.json (', externalLinks.length, 'link actions,', resourcesOut.summary.distinctUrls, 'distinct URLs )');

  // ---- navigation-map.json ----

  const nav = appDefinition.navigation || {};
  const app = appDefinition.app || {};

  const brokenNavEdges = internalNavEdges.filter((e) => !e.targetExistsAsScreen);

  const navigationMap = {
    appLevel: {
      title: app.title !== undefined ? app.title : null,
      onPageDidMountEvents: (app.events && app.events.onPageDidMount) || [],
    },
    tabsFromSourceNavConfig: {
      mobile: (nav.mobile && nav.mobile.tabs) || [],
      custom: (nav.custom && nav.custom.tabs) || [],
      note: 'Verbatim from appDefinition.navigation -- not reinterpreted.',
    },
    screensListFromSourceNavConfig: nav.screens || [],
    legacyLayouts: nav.legacyLayouts || null,
    internalPageNavigationEdges: {
      description:
        'Every "Open page" flow-function action found anywhere in the app, i.e. ' +
        'every place a component tap (or other trigger) navigates the user from ' +
        'one page to another. This is the actual navigation graph as encoded by ' +
        'the original app\'s flow logic, not a guess based on page numbering.',
      totalEdges: internalNavEdges.length,
      distinctSourcePages: new Set(internalNavEdges.map((e) => e.fromPageId)).size,
      distinctTargetPages: new Set(internalNavEdges.map((e) => e.toPageId)).size,
      brokenEdgeCount: brokenNavEdges.length,
      edges: internalNavEdges,
    },
    brokenNavigationEdges: brokenNavEdges,
    otherFlowFunctionTitlesEncountered: {
      description:
        'All distinct flow-function node titles seen while scanning for "Open URL" ' +
        'and "Open page" actions, other than those two. Recorded for transparency ' +
        '-- this extraction only interprets Open URL / Open page semantics; other ' +
        'flow actions (state changes, conditionals, etc.) were left unparsed as ' +
        'out of scope for content recovery.',
      titles: Array.from(otherFlowActionTitles).sort(),
    },
  };
  fs.writeFileSync(path.join(OUT_DIR, 'navigation-map.json'), JSON.stringify(navigationMap, null, 2), 'utf8');
  console.log('[04] Wrote navigation-map.json (', internalNavEdges.length, 'internal nav edges,', brokenNavEdges.length, 'broken )');
}

main();
