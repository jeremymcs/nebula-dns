#!/bin/sh
set -e

UPLOAD_DIR="${BLOCK_PAGE_UPLOAD_DIR:-/app/uploads/block-pages}"
mkdir -p "$UPLOAD_DIR"
chown -R node:node /app/uploads

exec su-exec node "$@"
