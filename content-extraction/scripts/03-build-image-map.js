'use strict';
/**
 * Phase 3G.
 *
 * Builds content-extraction/image-map.json, recovering:
 *   ag-asset://<uuid>  ->  actual file in /images  ->  page(s)/component(s) that reference it
 *
 * Source of truth for the asset registry is appDefinition.assets (keyed by
 * uuid, with the ORIGINAL pre-export filename, content-type, byte size, and
 * created_at -- this is genuine provenance data from the SAP Build Apps asset
 * store, not something this script invents).
 *
 * Source of truth for "is this image actually used, and where" is the
 * per-page component tree already walked by 02 (content-extraction/_generated/page-content.json),
 * scanned for `src` / `backgroundImage` props equal to "ag-asset://<uuid>".
 *
 * This script does NOT rename, move, or modify any file under /images. It
 * only reads that directory to cross-reference which UUIDs have a
 * corresponding local file and to detect duplicates/mismatched extensions.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(REPO_ROOT, 'images');
const GEN_DIR = path.join(__dirname, '..', '_generated');
const OUT_DIR = path.join(__dirname, '..');

// Minimal, dependency-free magic-byte sniffing -- enough to distinguish the
// handful of formats actually present (jpg/png/webp/gif) without adding an
// npm dependency to this extraction pipeline.
function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buf.length >= 6 && (buf.slice(0, 6).toString('ascii') === 'GIF87a' || buf.slice(0, 6).toString('ascii') === 'GIF89a')) return 'gif';
  return 'unknown';
}

function main() {
  const appDefinition = JSON.parse(fs.readFileSync(path.join(GEN_DIR, 'app-definition.json'), 'utf8'));
  const pageContent = JSON.parse(fs.readFileSync(path.join(GEN_DIR, 'page-content.json'), 'utf8'));

  // Index: uuid -> [{pageId, componentId, propName}]
  const referencesByUuid = {};
  for (const [pageId, blocks] of Object.entries(pageContent)) {
    for (const b of blocks) {
      for (const propName of ['src', 'backgroundImage']) {
        const val = b[propName];
        if (typeof val === 'string' && val.startsWith('ag-asset://')) {
          const uuid = val.replace('ag-asset://', '');
          (referencesByUuid[uuid] = referencesByUuid[uuid] || []).push({
            pageId,
            componentId: b.componentId,
            componentType: b.type,
            prop: propName,
          });
        }
      }
    }
  }

  // Actual local files on disk.
  let localFiles = [];
  if (fs.existsSync(IMAGES_DIR)) {
    localFiles = fs.readdirSync(IMAGES_DIR).filter((f) => f !== '.DS_Store');
  }
  const localFilesByUuid = {};
  for (const f of localFiles) {
    const uuid = f.replace(/\.[^.]+$/, '');
    localFilesByUuid[uuid] = f;
  }

  const assets = appDefinition.assets || {};
  const images = [];
  const checksums = {};

  for (const [uuid, asset] of Object.entries(assets)) {
    const fileMeta = (asset.files && asset.files[0]) || {};
    const localFile = localFilesByUuid[uuid] || null;
    let localFileAbsPath = null;
    let actualByteSize = null;
    let actualSniffedType = null;
    let sha256 = null;

    if (localFile) {
      localFileAbsPath = path.join(IMAGES_DIR, localFile);
      const buf = fs.readFileSync(localFileAbsPath);
      actualByteSize = buf.length;
      actualSniffedType = sniffImageType(buf);
      sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      (checksums[sha256] = checksums[sha256] || []).push(uuid);
    }

    const declaredExt = (localFile || '').split('.').pop() || null;
    const extensionMismatch =
      localFile != null &&
      actualSniffedType !== 'unknown' &&
      !(
        (declaredExt === 'jpg' || declaredExt === 'jpeg') && actualSniffedType === 'jpeg' ||
        declaredExt === 'png' && actualSniffedType === 'png' ||
        declaredExt === 'webp' && actualSniffedType === 'webp' ||
        declaredExt === 'gif' && actualSniffedType === 'gif'
      );

    images.push({
      assetUuid: uuid,
      agAssetUri: 'ag-asset://' + uuid,
      sourceOriginalName: asset.name !== undefined ? asset.name : null,
      sourceCreatedAt: asset.created_at || null,
      sourceFile: {
        filename: fileMeta.filename || null,
        contentType: fileMeta.content_type || null,
        declaredByteSize: typeof fileMeta.byte_size === 'number' ? fileMeta.byte_size : null,
      },
      localFile: localFile ? {
        relativePath: 'images/' + localFile,
        declaredExtension: declaredExt,
        actualByteSize,
        sniffedFileType: actualSniffedType,
        extensionMismatch,
        sha256,
      } : null,
      localFileMissing: !localFile,
      referencedInPages: (referencesByUuid[uuid] || []).map((r) => ({
        pageId: r.pageId,
        componentId: r.componentId,
        componentType: r.componentType,
        prop: r.prop,
      })),
      referencedInPageCount: (referencesByUuid[uuid] || []).length,
      referencedButUnusedInAnyWalkedPage: (referencesByUuid[uuid] || []).length === 0,
    });
  }

  // Local files that exist on disk but have NO corresponding entry in the
  // asset registry at all (not just unreferenced -- literally absent from
  // appDefinition.assets).
  const assetUuids = new Set(Object.keys(assets));
  const orphanedLocalFiles = localFiles
    .filter((f) => !assetUuids.has(f.replace(/\.[^.]+$/, '')))
    .map((f) => 'images/' + f);

  const duplicateGroups = Object.entries(checksums)
    .filter(([, uuids]) => uuids.length > 1)
    .map(([sha256, uuids]) => ({ sha256, assetUuids: uuids }));

  const extensionMismatches = images.filter((i) => i.localFile && i.localFile.extensionMismatch);
  const missingLocalFiles = images.filter((i) => i.localFileMissing);
  const unreferenced = images.filter((i) => i.referencedButUnusedInAnyWalkedPage);

  const output = {
    summary: {
      assetRegistryCount: images.length,
      localImageFileCount: localFiles.length,
      mappedCount: images.filter((i) => i.localFile).length,
      missingLocalFileCount: missingLocalFiles.length,
      orphanedLocalFileCount: orphanedLocalFiles.length,
      duplicateGroupCount: duplicateGroups.length,
      extensionMismatchCount: extensionMismatches.length,
      unreferencedCount: unreferenced.length,
    },
    duplicateGroups,
    extensionMismatches: extensionMismatches.map((i) => ({
      assetUuid: i.assetUuid,
      localFile: i.localFile.relativePath,
      declaredExtension: i.localFile.declaredExtension,
      sniffedFileType: i.localFile.sniffedFileType,
    })),
    missingLocalFiles: missingLocalFiles.map((i) => ({ assetUuid: i.assetUuid, sourceOriginalName: i.sourceOriginalName })),
    orphanedLocalFiles,
    unreferenced: unreferenced.map((i) => ({ assetUuid: i.assetUuid, localFile: i.localFile && i.localFile.relativePath, sourceOriginalName: i.sourceOriginalName })),
    images,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'image-map.json'), JSON.stringify(output, null, 2), 'utf8');
  console.log('[03] Wrote image-map.json (', images.length, 'assets,', output.summary.mappedCount, 'mapped to local files )');
  console.log('[03] duplicates:', duplicateGroups.length, ' extension mismatches:', extensionMismatches.length, ' orphaned local files:', orphanedLocalFiles.length, ' unreferenced:', unreferenced.length);
}

main();
