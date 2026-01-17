#!/bin/bash
# Nebula DNS - Policy Service Integration Tests Runner
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Nebula DNS Policy Service - Integration Tests${NC}"
echo "=============================================="
echo ""

# Check if Redis is running
REDIS_URL="${REDIS_URL:-localhost:4379}"
echo "Checking Redis connection at ${REDIS_URL}..."

if ! nc -z ${REDIS_URL/:/ } 2>/dev/null; then
    echo -e "${RED}Error: Cannot connect to Redis at ${REDIS_URL}${NC}"
    echo ""
    echo "Please start Redis using one of the following methods:"
    echo "  1. Docker Compose: docker-compose up -d redis"
    echo "  2. Local Redis: redis-server"
    echo "  3. Set REDIS_URL env var to point to your Redis instance"
    exit 1
fi

echo -e "${GREEN}Redis connection OK${NC}"
echo ""

# Run tests
echo "Running integration tests..."
echo ""

if go test -v -tags=integration ./tests/integration/...; then
    echo ""
    echo -e "${GREEN}✓ All integration tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
