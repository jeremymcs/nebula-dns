#!/bin/bash
# Test script for IP-based location lookup
# Tests both the NestJS API and Go policy-svc endpoints

set -e

echo "=== IP-Based Location Lookup Test ==="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:4010}"
POLICY_SVC_URL="${POLICY_SVC_URL:-http://localhost:4080}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

# Test 1: Check policy-svc health
echo "1. Testing policy-svc health..."
if curl -s "${POLICY_SVC_URL}/health" | grep -q "healthy"; then
    success "policy-svc is healthy"
else
    fail "policy-svc is not healthy"
    exit 1
fi

# Test 2: Check NestJS API health
echo ""
echo "2. Testing NestJS API health..."
if curl -s "${API_URL}/health" | grep -q "ok\|healthy"; then
    success "NestJS API is healthy"
else
    fail "NestJS API is not healthy"
    info "Note: NestJS API may not be required for IP lookup"
fi

# Test 3: Test policy-svc IP lookup (with known IP)
echo ""
echo "3. Testing policy-svc IP lookup..."
LOOKUP_RESULT=$(curl -s -X POST "${POLICY_SVC_URL}/auth/lookup-ip" \
    -H "Content-Type: application/json" \
    -d '{"client_ip": "192.168.1.100"}')
echo "   Response: ${LOOKUP_RESULT}"

# Test 4: Test policy-svc IP lookup (with unknown IP)
echo ""
echo "4. Testing policy-svc IP lookup with unknown IP..."
LOOKUP_RESULT=$(curl -s -X POST "${POLICY_SVC_URL}/auth/lookup-ip" \
    -H "Content-Type: application/json" \
    -d '{"client_ip": "10.255.255.255"}')
echo "   Response: ${LOOKUP_RESULT}"

# Test 5: Test NestJS API IP lookup endpoint (if available)
echo ""
echo "5. Testing NestJS API IP lookup endpoint..."
LOOKUP_RESULT=$(curl -s "${API_URL}/locations/by-ip/192.168.1.100" 2>/dev/null || echo '{"error": "endpoint not available"}')
echo "   Response: ${LOOKUP_RESULT}"

# Test 6: Test token validation (should work without changes)
echo ""
echo "6. Testing token validation..."
TOKEN_RESULT=$(curl -s -X POST "${POLICY_SVC_URL}/auth/validate" \
    -H "Content-Type: application/json" \
    -d '{"token": "invalid-token"}')
echo "   Response: ${TOKEN_RESULT}"

echo ""
echo "=== Test Summary ==="
echo "The IP lookup functionality is working if:"
echo "  - Test 3 returns either {found: true, ...} or {found: false}"
echo "  - Test 4 should return {found: false} for unknown IPs"
echo ""
echo "To test with actual data:"
echo "  1. Create a location with IP range via the UI"
echo "  2. Run this script again"
echo "  3. Test 3 should return the location details"
echo ""
info "Done!"

