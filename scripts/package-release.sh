#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  VERSION="$(node -p "require('${ROOT_DIR}/package.json').version")"
fi

VERSION="${VERSION#v}"
PACKAGE_NAME="qbitctl-${VERSION}"
DIST_DIR="${ROOT_DIR}/dist"
PACKAGE_DIR="${DIST_DIR}/${PACKAGE_NAME}"
PUBLIC_DIR="${PACKAGE_DIR}/public"

rm -rf "${DIST_DIR}"
mkdir -p "${PUBLIC_DIR}"

if [[ ! -d "${ROOT_DIR}/build/public" ]]; then
  echo "build/public does not exist. Run yarn build first." >&2
  exit 1
fi

cp -R "${ROOT_DIR}/build/public/." "${PUBLIC_DIR}/"

(
  cd "${DIST_DIR}"
  zip -qr "${PACKAGE_NAME}.zip" "${PACKAGE_NAME}"
)

# Also package a fixed-name copy with a stable top-level folder, so curl-based
# updates can always fetch the same URL and extract to the same WebUI path.
LATEST_NAME="qbitctl"
cp -R "${PACKAGE_DIR}" "${DIST_DIR}/${LATEST_NAME}"

(
  cd "${DIST_DIR}"
  zip -qr "${LATEST_NAME}.zip" "${LATEST_NAME}"
)

echo "${DIST_DIR}/${PACKAGE_NAME}.zip"
