#!/bin/bash
# Nebula DNS - Redis Reset Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

set -e

REDIS_URL="${REDIS_URL:-redis://localhost:4379}"

if [[ -z "$REDIS_URL" ]]; then
    echo "[ERROR] REDIS_URL is not set"
    exit 1
fi

REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's|.*@([^:]+):([0-9]+).*|\1|')
REDIS_PORT=$(echo "$REDIS_URL" | sed -E 's|.*@([^:]+):([0-9]+).*|\2|')

echo "[INFO] Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}"

redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" FLUSHALL

echo "[OK] Redis flushed"
