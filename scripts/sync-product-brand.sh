#!/usr/bin/env bash
# Keep per-app product-brand.ts in sync with shared/product-brand.ts
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/shared/product-brand.ts"
for app in ui admin-ui www; do
  cp "$SRC" "$ROOT/$app/src/lib/product-brand.ts"
done
echo "Synced product-brand.ts to ui, admin-ui, www"
