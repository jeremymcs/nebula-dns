#!/usr/bin/env bash
# Starts the NestJS API for Playwright E2E (expects Postgres + Redis on localhost).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT}/api"

export DATABASE_URL="${DATABASE_URL:-postgresql://test:test@localhost:5432/nebula_test}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret-for-e2e-tests}"
export NODE_ENV="${NODE_ENV:-test}"
export PORT="${PORT:-4010}"

if [[ ! -d dist ]]; then
  echo "API dist/ missing; run npm run build in api/ before E2E"
  exit 1
fi

npm run migration:run

exec node dist/main.js
