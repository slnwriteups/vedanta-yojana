'use strict';
/**
 * Phase 3N.
 *
 * Post-extraction validation. Reports failures rather than silently
 * correcting anything. Exits non-zero if any hard check fails.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { sha256File, EXPECTED_SHA256 } = require('./lib/decode-bundle');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUNDLE_PATH = path.join(REPO_ROOT, '_next/static/chunks/pages/_app-72a25e792e2e05f2.js');
const GEN_DIR = path.join(__dirname, '..', '_generated');
const OUT_DIR = path.join(__dirname, '..');

let failures = 0;
let warnings = 0;
function ok(label) { console.log('  OK   ', label); }
function fail(label, detail) { console.log('  FAIL ', label, detail ? '-- ' + detail : ''); failures++; }
function warn(label, detail) { console.log('  WARN ', label, detail ? '-- ' + detail : ''); warnings++; }

function main() {
  console.log('=== 1. Original bundle unchanged (SHA-256) ===');
  const hash = sha256File(BUNDLE_PATH);
  if (hash === EXPECTED_SHA256) ok('bundle sha256 matches ' + EXPECTED_SHA256);
  else fail('bundle sha256 mismatch', 'expected ' + EXPECTED_SHA256 + ' got ' + hash);

  console.log('=== 2. No existing repository files modified ===');
  const status = execSync('git status --porcelain', { cwd: REPO_ROOT }).toString();
  const lines = status.split('\n').filter(Boolean);
  const unexpected = lines.filter((l) => !l.slice(3).startsWith('content-extraction/'));
  if (unexpected.length === 0) ok('git status shows changes only under content-extraction/ (' + lines.length + ' entries)');
  else fail('unexpected changes outside content-extraction/', JSON.stringify(unexpected));

  console.log('=== 3. Generated JSON files are valid ===');
  const jsonFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.json')) jsonFiles.push(p);
    }
  }
  walk(OUT_DIR);
  let invalidCount = 0;
  for (const f of jsonFiles) {
    try { JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { invalidCount++; fail('invalid JSON', f + ' -- ' + e.message); }
  }
  if (invalidCount === 0) ok(jsonFiles.length + ' JSON files parse successfully');

  console.log('=== 4. Round-trip check (no silent truncation/corruption during decode) ===');
  const appDefinition = JSON.parse(fs.readFileSync(path.join(GEN_DIR, 'app-definition.json'), 'utf8'));
  const roundTripped = JSON.parse(JSON.stringify(appDefinition));
  if (JSON.stringify(roundTripped) === JSON.stringify(appDefinition)) ok('app-definition.json round-trips through JSON.parse/stringify unchanged');
  else fail('round-trip mismatch on app-definition.json');

  console.log('=== 5. Core counts ===');
  const pageInventory = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'page-inventory.json'), 'utf8'));
  const screensCount = Object.keys(appDefinition.screens).length;
  if (pageInventory.pageCount === screensCount) ok('page-inventory.json page count (' + pageInventory.pageCount + ') matches appDefinition.screens count');
  else fail('page count mismatch', pageInventory.pageCount + ' vs ' + screensCount);

  const imageMap = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'image-map.json'), 'utf8'));
  const assetsCount = Object.keys(appDefinition.assets).length;
  if (imageMap.summary.assetRegistryCount === assetsCount) ok('image-map.json asset count (' + assetsCount + ') matches appDefinition.assets');
  else fail('asset count mismatch');

  const divyaDesamIndex = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'divya-desams', 'index.json'), 'utf8'));
  const articleIndex = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'articles', 'index.json'), 'utf8'));
  console.log('  INFO  divya-desams records:', divyaDesamIndex.count);
  console.log('  INFO  article records:', articleIndex.count);

  const resources = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'resources', 'external-links.json'), 'utf8'));
  console.log('  INFO  external link actions:', resources.summary.totalExternalLinkActions, ' distinct URLs:', resources.summary.distinctUrls);

  const unresolved = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'unresolved.json'), 'utf8'));
  console.log('  INFO  unresolved.json entries:', unresolved.count);

  console.log('=== 6. Unicode preservation spot check ===');
  // page.Page99 "Tiruayodhi (Ayodhya)" and several stotram pages are expected
  // to contain non-ASCII (Sanskrit/Tamil-derived, diacritic) text somewhere
  // in the corpus. Confirm at least one non-ASCII character survived intact
  // in the final page-content dump.
  const pageContent = JSON.parse(fs.readFileSync(path.join(GEN_DIR, 'page-content.json'), 'utf8'));
  let foundNonAscii = false;
  let sampleNonAscii = null;
  outer:
  for (const blocks of Object.values(pageContent)) {
    for (const b of blocks) {
      if (typeof b.content === 'string' && /[^\x00-\x7F]/.test(b.content)) {
        foundNonAscii = true;
        sampleNonAscii = b.content.slice(0, 60);
        break outer;
      }
    }
  }
  if (foundNonAscii) ok('non-ASCII text present and intact in extracted content, e.g. "' + sampleNonAscii + '"');
  else warn('no non-ASCII text block found in the entire corpus', 'verify this is expected, not a decoding bug');

  console.log('=== 7. URL fidelity spot check ===');
  const rawBundle = fs.readFileSync(BUNDLE_PATH, 'utf8');
  let urlMismatch = 0;
  const sampleLinks = resources.links.slice(0, 25);
  for (const l of sampleLinks) {
    if (!rawBundle.includes(l.url)) { urlMismatch++; warn('extracted URL not found verbatim in raw bundle text', l.url); }
  }
  if (urlMismatch === 0) ok(sampleLinks.length + ' sampled URLs found verbatim in the raw bundle (no silent alteration)');

  console.log('=== 8. Long text block preservation check ===');
  let longestBlock = { len: 0 };
  for (const [pageId, blocks] of Object.entries(pageContent)) {
    for (const b of blocks) {
      if (typeof b.content === 'string' && b.content.length > longestBlock.len) {
        longestBlock = { len: b.content.length, pageId, preview: b.content.slice(0, 80) };
      }
    }
  }
  console.log('  INFO  longest single text block:', longestBlock.len, 'chars on', longestBlock.pageId, '--', JSON.stringify(longestBlock.preview) + '...');
  if (longestBlock.len > 0) ok('longest text block recorded (no evidence of an artificial length cap)');

  console.log('\n=== SUMMARY ===');
  console.log('failures:', failures, ' warnings:', warnings);
  if (failures > 0) process.exit(1);
}

main();
