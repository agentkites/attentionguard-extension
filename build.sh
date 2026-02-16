#!/bin/bash
# build.sh - Package AttentionGuard for Chrome and Firefox
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
BUILD_DIR="build"

echo "Building AttentionGuard v${VERSION}..."

# Clean previous builds
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/chrome" "${BUILD_DIR}/firefox"

# Files/directories shared by both browsers
SHARED_ITEMS=(
  "background"
  "content-scripts"
  "popup"
  "assets"
)

# Copy shared files to both builds
for target in chrome firefox; do
  for item in "${SHARED_ITEMS[@]}"; do
    cp -r "$item" "${BUILD_DIR}/${target}/${item}"
  done
  # Copy optional root files if they exist
  [ -f "LICENSE" ] && cp "LICENSE" "${BUILD_DIR}/${target}/"
  [ -f "README.md" ] && cp "README.md" "${BUILD_DIR}/${target}/"
done

# Copy browser-specific manifests
cp manifest.json "${BUILD_DIR}/chrome/manifest.json"
cp manifest.firefox.json "${BUILD_DIR}/firefox/manifest.json"

# Create zip files
(cd "${BUILD_DIR}/chrome" && zip -rq "../attentionguard-${VERSION}-chrome.zip" . -x "*.DS_Store")
(cd "${BUILD_DIR}/firefox" && zip -rq "../attentionguard-${VERSION}-firefox.zip" . -x "*.DS_Store")

echo ""
echo "Build complete!"
echo "  Chrome:  ${BUILD_DIR}/attentionguard-${VERSION}-chrome.zip"
echo "  Firefox: ${BUILD_DIR}/attentionguard-${VERSION}-firefox.zip"
