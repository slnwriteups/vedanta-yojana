'use strict';
/**
 * Phase 3C step 1.
 *
 * Reads the original SAP Build Apps bundle (never modifies it), decodes the
 * embedded app definition, and writes it out as clean, readable, deterministic
 * JSON under content-extraction/_generated/. This is the single master
 * artifact every later extraction script reads from, so the (slow, careful)
 * bundle-parsing logic only runs once per pipeline run.
 *
 * Run: node content-extraction/scripts/01-extract-app-definition.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { extractAppDefinition } = require('./lib/decode-bundle');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUNDLE_PATH = path.join(
  REPO_ROOT,
  '_next/static/chunks/pages/_app-72a25e792e2e05f2.js'
);
const OUT_DIR = path.join(__dirname, '..', '_generated');

function gitInfo() {
  const info = { commit: 'UNKNOWN', branch: 'UNKNOWN', workingTreeClean: 'UNKNOWN' };
  try {
    info.commit = execSync('git rev-parse HEAD', { cwd: REPO_ROOT }).toString().trim();
    info.branch = execSync('git branch --show-current', { cwd: REPO_ROOT }).toString().trim();
    const status = execSync('git status --porcelain', { cwd: REPO_ROOT }).toString();
    info.workingTreeClean = status.trim().length === 0;
    info.workingTreeStatusRaw = status;
  } catch (e) {
    info.error = e.message;
  }
  return info;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!fs.existsSync(BUNDLE_PATH)) {
    console.error('FATAL: bundle not found at', BUNDLE_PATH);
    process.exit(1);
  }

  console.log('[01] Reading bundle:', BUNDLE_PATH);
  const before = gitInfo();

  const { appDefinition, meta } = extractAppDefinition(BUNDLE_PATH);

  const outPath = path.join(OUT_DIR, 'app-definition.json');
  const json = JSON.stringify(appDefinition, null, 2);
  fs.writeFileSync(outPath, json, 'utf8');
  console.log('[01] Wrote', outPath, '(', fs.statSync(outPath).size, 'bytes )');

  const after = gitInfo();

  const provenance = {
    sourceRepo: {
      commitAtExtractionStart: before.commit,
      commitAtExtractionEnd: after.commit,
      branch: before.branch,
      workingTreeCleanAtStart: before.workingTreeClean,
    },
    bundle: {
      absolutePath: meta.bundlePath,
      relativePathFromRepoRoot: path.relative(REPO_ROOT, meta.bundlePath),
      byteSize: meta.byteSize,
      sha256: meta.sha256,
      mtime: meta.mtime,
    },
    extractionMethod: {
      description:
        'Located the unique anchor string JSON.parse(\'{"parserVersion" inside the ' +
        'bundle, character-scanned forward from the opening quote to find the ' +
        'matching unescaped closing quote (honoring backslash escaping), decoded ' +
        'the resulting JS string-literal token via new Function(\'return \'+literal)(), ' +
        'then JSON.parse()d the decoded string.',
      anchorByteOffset: meta.anchorByteOffset,
      literalByteLength: meta.literalByteLength,
      decodedJsonCharLength: meta.decodedJsonCharLength,
      scriptPath: 'content-extraction/scripts/01-extract-app-definition.js',
      decoderLibPath: 'content-extraction/scripts/lib/decode-bundle.js',
    },
    appDefinitionTopLevelKeys: Object.keys(appDefinition),
    notes: [
      'This file (provenance.json) intentionally contains no wall-clock timestamp ' +
      'fields describing "when extracted", to keep pipeline output byte-for-byte ' +
      'deterministic across reruns against the same bundle. See extraction-report.md ' +
      'for a human-readable summary with a generation date.',
    ],
  };
  fs.writeFileSync(
    path.join(OUT_DIR, 'provenance.json'),
    JSON.stringify(provenance, null, 2),
    'utf8'
  );
  console.log('[01] Wrote provenance.json');
}

main();
