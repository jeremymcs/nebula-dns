#!/usr/bin/env bash
# Keep per-app copies in sync with shared/ (Docker build contexts are per-app only).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

sync_file() {
  local src_name="$1"
  shift
  local src="$ROOT/shared/$src_name"
  for app in "$@"; do
    cp "$src" "$ROOT/$app/src/lib/$src_name"
  done
}

sync_file product-brand.ts ui admin-ui www
sync_file print-mfa-backup-codes.ts ui admin-ui

echo "Synced shared libs to ui, admin-ui, www (product-brand) and ui, admin-ui (print-mfa-backup-codes)"
