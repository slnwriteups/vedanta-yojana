'use strict';
/**
 * Walks a screen's component tree in source (document) order.
 *
 * Each screen (appDefinition.screens[pageId]) has a `components` array of
 * root component references, each of the shape { id, ch: [...] } where `ch`
 * lists child component references in the same shape. The actual component
 * definitions (type, text content, image src, button label, styles, etc.)
 * live in the separate top-level `appDefinition.components` dictionary,
 * keyed by the same ids.
 *
 * This walker resolves that tree deterministically and in the order the
 * source data lists it, which is the closest available approximation of
 * on-screen reading order for this application (the source has no separate
 * "reading order" or "heading level" concept beyond component nesting and
 * font-size styling).
 */

function walkScreenComponents(appDefinition, pageId) {
  const screen = appDefinition.screens[pageId];
  if (!screen) return null;

  const components = appDefinition.components;
  const blocks = [];
  const seen = new Set();
  let order = 0;

  function visit(ref, depth) {
    const comp = components[ref.id];
    if (!comp) {
      blocks.push({
        order: order++,
        depth,
        componentId: ref.id,
        type: 'UNRESOLVED_COMPONENT_REF',
        note: 'Referenced component id was not found in the app definition\'s components dictionary.',
      });
      return;
    }
    if (seen.has(ref.id)) {
      // Defensive only: no cycles were observed during investigation, but a
      // malformed/edited export could in principle contain one, and this
      // extraction must never hang or crash on such input.
      blocks.push({
        order: order++,
        depth,
        componentId: ref.id,
        type: 'CYCLE_DETECTED',
        note: 'This component id was already visited earlier in the same tree; skipped to avoid an infinite loop.',
      });
      return;
    }
    seen.add(ref.id);

    const pluginComponentId = comp.pluginComponentId || null;
    const shortType = pluginComponentId ? pluginComponentId.split(':').pop() : 'unknown';

    const block = {
      order: order++,
      depth,
      componentId: comp.id,
      pluginComponentId,
      type: shortType,
      pageId: comp.pageId !== undefined ? comp.pageId : null,
      flowGroupId: (comp.props && comp.props.flowGroupId) || null,
    };

    const props = comp.props || {};
    if (Object.prototype.hasOwnProperty.call(props, 'content')) block.content = props.content;
    if (Object.prototype.hasOwnProperty.call(props, 'label')) block.label = props.label;
    if (Object.prototype.hasOwnProperty.call(props, 'src')) block.src = props.src;
    if (Object.prototype.hasOwnProperty.call(props, 'iconName')) block.iconName = props.iconName;
    if (Object.prototype.hasOwnProperty.call(props, 'backgroundImage') && props.backgroundImage) {
      block.backgroundImage = props.backgroundImage;
    }
    // Record font size as ancillary metadata only -- NOT as an inferred
    // heading level. The source schema has no explicit heading/paragraph
    // distinction; this is preserved for human reference only.
    if (comp.props && comp.props.styles && comp.props.styles.text && typeof comp.props.styles.text.fontSize === 'number') {
      block.textFontSizeHint = comp.props.styles.text.fontSize;
    }

    blocks.push(block);

    for (const child of (ref.ch || [])) visit(child, depth + 1);
  }

  for (const root of (screen.components || [])) visit(root, 0);

  return blocks;
}

module.exports = { walkScreenComponents };
