#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

INSTALL_DIR="C:/Users/oscar/AppData/Local/Programs/mcpb"
INSTALL_EXE="$INSTALL_DIR/mcpb.exe"
DIST_EXE="$REPO_ROOT/dist/mcpb-windows.exe"

cd "$REPO_ROOT"

deno task build:windows

if [ ! -f "$DIST_EXE" ]; then
  echo "Expected build output not found: $DIST_EXE" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR"
rm -f "$INSTALL_EXE"
mv "$DIST_EXE" "$INSTALL_EXE"
