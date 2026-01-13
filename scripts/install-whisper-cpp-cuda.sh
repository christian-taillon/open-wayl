#!/usr/bin/env bash
set -euo pipefail

REPO="ggml-org/whisper.cpp"
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
INSTALL_PREFIX="${INSTALL_PREFIX:-/usr/local}"
WORK_DIR="${WORK_DIR:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd git
require_cmd cmake
require_cmd make
require_cmd python3

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "Warning: nvidia-smi not found; ensure NVIDIA drivers are installed." >&2
fi

fetch_latest_tag() {
  local tag
  tag=$(curl -sL "$API_URL" | python3 -c 'import json,sys; print(json.load(sys.stdin)["tag_name"])' 2>/dev/null || true)
  if [[ -n "$tag" ]]; then
    echo "$tag"
    return 0
  fi

  tag=$(git ls-remote --tags "https://github.com/${REPO}.git" \
    | awk -F/ '{print $3}' \
    | grep -v '\^{}' \
    | sort -V \
    | tail -n1 || true)

  if [[ -z "$tag" ]]; then
    echo "Failed to determine latest release tag." >&2
    exit 1
  fi

  echo "$tag"
}

LATEST_TAG=$(fetch_latest_tag)

if [[ -n "$WORK_DIR" ]]; then
  BUILD_ROOT="$WORK_DIR"
  mkdir -p "$BUILD_ROOT"
else
  BUILD_ROOT=$(mktemp -d)
fi

cleanup() {
  if [[ -z "$WORK_DIR" ]]; then
    rm -rf "$BUILD_ROOT"
  fi
}
trap cleanup EXIT

SRC_DIR="$BUILD_ROOT/whisper.cpp"
BUILD_DIR="$SRC_DIR/build"

if [[ -d "$SRC_DIR" ]]; then
  rm -rf "$SRC_DIR"
fi

echo "Cloning ${REPO} (${LATEST_TAG})..."
git clone --depth 1 --branch "$LATEST_TAG" "https://github.com/${REPO}.git" "$SRC_DIR"

cmake -S "$SRC_DIR" -B "$BUILD_DIR" -DGGML_CUDA=1
cmake --build "$BUILD_DIR" -j "$(nproc)" --config Release

binary=""
for candidate in "$BUILD_DIR/bin/whisper-cli" "$BUILD_DIR/bin/main"; do
  if [[ -x "$candidate" ]]; then
    binary="$candidate"
    break
  fi
done

if [[ -z "$binary" ]]; then
  echo "Build succeeded but no whisper-cli binary found." >&2
  exit 1
fi

install_dir="$INSTALL_PREFIX/bin"
install_path="$install_dir/whisper-cpp"

if [[ ! -d "$install_dir" ]]; then
  echo "Creating install dir: $install_dir"
  if [[ -w "$(dirname "$install_dir")" ]]; then
    mkdir -p "$install_dir"
  else
    sudo mkdir -p "$install_dir"
  fi
fi

if [[ -w "$install_dir" ]]; then
  install -m 755 "$binary" "$install_path"
else
  sudo install -m 755 "$binary" "$install_path"
fi

echo "Installed CUDA-enabled whisper.cpp to: $install_path"

echo "Verify with: $install_path --help"
