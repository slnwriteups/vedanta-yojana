#!/usr/bin/env bash
# Reproduces the entire Phase 3 content extraction from scratch.
#
# Usage (from anywhere):
#   bash content-extraction/scripts/run-all.sh
#
# Requires only Node.js (no npm install / no external dependencies -- every
# script uses only Node's built-in fs/path/crypto/child_process modules).
#
# Reads:  _next/static/chunks/pages/_app-72a25e792e2e05f2.js  (never modified)
#         images/  (read-only, never modified)
# Writes: everything under content-extraction/ (this directory), overwriting
#         only files this pipeline itself previously generated.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Phase 3 content extraction: run-all ==="
echo "Scripts dir: $SCRIPT_DIR"
echo

node "$SCRIPT_DIR/01-extract-app-definition.js"
node "$SCRIPT_DIR/02-build-page-inventory.js"
node "$SCRIPT_DIR/03-build-image-map.js"
node "$SCRIPT_DIR/04-build-resources-and-navigation.js"
node "$SCRIPT_DIR/05-classify-and-emit-records.js"
node "$SCRIPT_DIR/06-build-unresolved.js"

echo
echo "=== Validation ==="
node "$SCRIPT_DIR/07-validate.js"

echo
echo "=== Done ==="
