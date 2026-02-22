#!/bin/bash
# Nebula DNS - PostgreSQL Reset Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

set -e

DATABASE_URL="${DATABASE_URL:-postgresql://nebula:nebula@localhost:4432/nebula}"

if [[ -z "$DATABASE_URL" ]]; then
    echo "[ERROR] DATABASE_URL is not set"
    exit 1
fi

PGHOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):([0-9]+)/.*|\1|')
PGPORT=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):([0-9]+)/.*|\2|')
PGDB=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+)(\?.*)?|\1|')
PGUSER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
PGPASSWORD=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')

export PGPASSWORD

echo "[INFO] Connecting to PostgreSQL at ${PGHOST}:${PGPORT}"
echo "[INFO] Database: ${PGDB}, User: ${PGUSER}"

echo "[INFO] Terminating existing connections to ${PGDB}..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDB}' AND pid <> pg_backend_pid();" 2>/dev/null || true

echo "[INFO] Dropping database ${PGDB}..."
dropdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" --if-exists "$PGDB"

echo "[INFO] Creating database ${PGDB}..."
createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$PGDB"

cd /Users/jeremymcspadden/Github/nebula-dns/api

echo "[INFO] Running migrations..."
npm run migration:run

if [ "$SEED_DATA" = "true" ]; then
    echo "[INFO] Seeding data..."
    npm run seed
fi

echo "[OK] PostgreSQL reset complete"
