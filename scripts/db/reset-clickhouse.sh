#!/bin/bash
# Nebula DNS - ClickHouse Reset Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

set -e

CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-4123}"
CLICKHOUSE_USER="${CLICKHOUSE_USER:-nebula}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-nebula}"
CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-nebula_dns}"

echo "[INFO] Connecting to ClickHouse at ${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}"
echo "[INFO] Database: ${CLICKHOUSE_DATABASE}, User: ${CLICKHOUSE_USER}"

echo "[INFO] Dropping database ${CLICKHOUSE_DATABASE}..."
curl -s "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?user=${CLICKHOUSE_USER}&password=${CLICKHOUSE_PASSWORD}" \
    --data "DROP DATABASE IF EXISTS ${CLICKHOUSE_DATABASE}"

echo "[INFO] Creating database ${CLICKHOUSE_DATABASE}..."
curl -s "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?user=${CLICKHOUSE_USER}&password=${CLICKHOUSE_PASSWORD}" \
    --data "CREATE DATABASE IF NOT EXISTS ${CLICKHOUSE_DATABASE}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INIT_SCRIPT="/Users/jeremymcspadden/Github/nebula-dns/scripts/init-clickhouse.sql"

if [ -f "$INIT_SCRIPT" ]; then
    echo "[INFO] Running init script..."
    while IFS= read -r line; do
        if [ -n "$line" ] && [[ ! "$line" =~ ^-- ]]; then
            curl -s "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?user=${CLICKHOUSE_USER}&password=${CLICKHOUSE_PASSWORD}&database=${CLICKHOUSE_DATABASE}" \
                --data "$line" > /dev/null 2>&1 || true
        fi
    done < "$INIT_SCRIPT"
fi

echo "[OK] ClickHouse reset complete"
