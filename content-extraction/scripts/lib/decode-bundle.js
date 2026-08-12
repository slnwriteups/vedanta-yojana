'use strict';
/**
 * Locates and decodes the SAP Build Apps / AppGyver "Composer Pro" application
 * definition embedded inside the compiled Next.js bundle:
 *
 *   _next/static/chunks/pages/_app-72a25e792e2e05f2.js
 *
 * Internally, that 14.4MB webpack bundle is almost entirely vendored library
 * code. Buried inside one giant module is a single statement of the form:
 *
 *   e.exports=JSON.parse('{"parserVersion":"4.17.60","screens":{...}, ...}')
 *
 * That JSON.parse(...) argument is a JS single-quoted string literal (not raw
 * JSON) containing the entire application definition: every screen, every UI
 * component, every flow-logic node (including "Open URL" actions), the asset
 * (image) registry, navigation config, theme, etc.
 *
 * This module finds that literal deterministically (via a unique anchor
 * string), extracts it by scanning character-by-character for the matching
 * closing quote (honoring backslash escaping), decodes the JS string escapes,
 * and JSON.parses the result.
 *
 * This file only READS the bundle. It never writes to or modifies it.
 */

const fs = require('fs');
const crypto = require('crypto');

// SHA-256 of _next/static/chunks/pages/_app-72a25e792e2e05f2.js as recorded
// during Phase 3A of the content-recovery audit (see
// content-extraction/_generated/provenance.json for the value recorded on
// each run). If this ever fails to match, the bundle has changed since this
// extraction pipeline was built and the anchor/structure assumptions below
// should be re-verified by hand before trusting the output.
const EXPECTED_SHA256 =
  'fae59cee76af97c2c0d069493e1e0df2d1a4755bcca2061292d1db82ca6d3ae1';

// Unique anchor marking the start of the app-definition JSON.parse() call.
// Verified unique (single occurrence) in the bundle during investigation.
const ANCHOR = 'JSON.parse(\'{"parserVersion"';

function sha256File(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * @param {string} bundleAbsPath absolute path to _app-72a25e792e2e05f2.js
 * @param {{enforceHash?: boolean}} opts
 * @returns {{appDefinition: object, meta: object}}
 */
function extractAppDefinition(bundleAbsPath, opts) {
  opts = opts || {};
  const enforceHash = opts.enforceHash !== false;

  const stat = fs.statSync(bundleAbsPath);
  const hash = sha256File(bundleAbsPath);

  if (enforceHash && hash !== EXPECTED_SHA256) {
    throw new Error(
      'SHA-256 mismatch for bundle ' + bundleAbsPath + '\n' +
      '  expected: ' + EXPECTED_SHA256 + '\n' +
      '  actual:   ' + hash + '\n' +
      'This extraction pipeline is pinned to a specific, known-good bundle so ' +
      'that "faithful/reproducible/deterministic" extraction claims are ' +
      'meaningful. If the bundle was intentionally re-exported, re-verify the ' +
      'anchor/structure assumptions in this file by hand, then update ' +
      'EXPECTED_SHA256 deliberately.'
    );
  }

  const src = fs.readFileSync(bundleAbsPath, 'utf8');

  const anchorIdx = src.indexOf(ANCHOR);
  if (anchorIdx === -1) {
    throw new Error(
      'PARSE FAILURE: could not locate the app-definition anchor ("' + ANCHOR +
      '") in the bundle. The bundle structure may have changed; this script ' +
      'must be re-verified against the new bundle before use.'
    );
  }

  const openQuoteIdx = src.indexOf("'", anchorIdx);
  if (openQuoteIdx === -1 || src[openQuoteIdx] !== "'") {
    throw new Error('PARSE FAILURE: expected opening quote after anchor was not found.');
  }

  // Walk forward from the opening quote to find the matching UNESCAPED
  // closing quote, honoring backslash-escaping (\\ and \').
  let i = openQuoteIdx + 1;
  let backslashRun = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      backslashRun++;
      i++;
      continue;
    }
    if (ch === "'" && backslashRun % 2 === 0) break;
    backslashRun = 0;
    i++;
  }
  if (i >= src.length) {
    throw new Error('PARSE FAILURE: reached end of file before finding the matching closing quote for the app-definition string literal.');
  }
  const closeQuoteIdx = i;

  // Exact source slice: one complete, self-contained JS string literal token,
  // e.g.  '....'   (opening quote through matching closing quote, inclusive).
  const literalSlice = src.slice(openQuoteIdx, closeQuoteIdx + 1);

  let decoded;
  try {
    // literalSlice is exactly one JS string-literal token. Evaluating
    // `return <literal>` can only ever produce a string value -- it cannot
    // execute arbitrary statements, since the Function body is a single
    // expression whose boundaries we've already located character-by-
    // character above. This is used (rather than a hand-rolled escape
    // decoder) so that JS string-escape decoding (\xHH, \uHHHH, \\, \', etc.)
    // is handled by the actual JS engine instead of a potentially incomplete
    // reimplementation, which matters for not silently corrupting non-ASCII
    // (Tamil/Sanskrit/etc.) source text.
    // eslint-disable-next-line no-new-func
    decoded = new Function('return ' + literalSlice)();
  } catch (e) {
    throw new Error('PARSE FAILURE: could not decode the JS string literal containing the app definition: ' + e.message);
  }

  if (typeof decoded !== 'string') {
    throw new Error('PARSE FAILURE: decoded app-definition literal is not a string (got ' + typeof decoded + ').');
  }

  let appDefinition;
  try {
    appDefinition = JSON.parse(decoded);
  } catch (e) {
    throw new Error('PARSE FAILURE: could not JSON.parse the decoded app-definition string: ' + e.message);
  }

  return {
    appDefinition,
    meta: {
      bundlePath: bundleAbsPath,
      byteSize: stat.size,
      mtime: stat.mtime.toISOString(),
      sha256: hash,
      anchorByteOffset: anchorIdx,
      literalByteLength: Buffer.byteLength(literalSlice, 'utf8'),
      decodedJsonCharLength: decoded.length,
    },
  };
}

module.exports = { extractAppDefinition, sha256File, EXPECTED_SHA256, ANCHOR };
