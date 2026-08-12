const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

/**
 * Phase 6A -- lets Metro see outside mobile/ so the content bridge can
 * import the validated content directly from its single source of truth
 * (../content, ../content-lib/schemas) via ordinary relative imports,
 * with NO copying and no duplicated editorial content. Metro only
 * bundles/watches files under watchFolders by default; without this, any
 * import reaching above mobile/ would fail to resolve.
 */
const REPO_ROOT = path.resolve(__dirname, "..");

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.join(REPO_ROOT, "content"),
  path.join(REPO_ROOT, "content-lib"),
];

/**
 * content-lib/schemas imports "zod" -- but content-lib/ is a sibling of
 * mobile/, not an ancestor, so mobile's own node_modules is never on
 * Metro's normal upward-resolution path from a file inside content-lib/.
 * Verified empirically (per this project's established practice, not
 * assumed): without this, `expo export` fails with "Unable to resolve
 * module zod from .../content-lib/schemas/shared.ts", reporting that it
 * only checked content-lib's own immediate node_modules, not the repo
 * root's (which mobile does not share). Explicitly adding the repo
 * root's node_modules closes that one specific gap without asking Metro
 * to prefer the root's copy of anything mobile/ itself depends on --
 * mobile/node_modules is still resolved first for everything else.
 */
config.resolver.nodeModulesPaths = [
  path.join(__dirname, "node_modules"),
  path.join(REPO_ROOT, "node_modules"),
];

module.exports = config;
