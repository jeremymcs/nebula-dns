#!/bin/bash
# Nebula DNS - Network Policy Verification Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# This script verifies that network policies are correctly configured
# and enforcing expected traffic rules.

set -e

NAMESPACE="nebula-dns"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Nebula DNS Network Policy Verification"
echo "========================================="
echo ""

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print failure
failure() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Function to test connection
test_connection() {
    local pod=$1
    local host=$2
    local port=$3
    local should_succeed=$4
    local description=$5

    echo -n "Testing: $description... "

    if kubectl exec -n $NAMESPACE $pod -- timeout 2 nc -zv $host $port &> /dev/null; then
        if [ "$should_succeed" = "true" ]; then
            success "PASS (connection succeeded as expected)"
            return 0
        else
            failure "FAIL (connection succeeded but should have been blocked)"
            return 1
        fi
    else
        if [ "$should_succeed" = "false" ]; then
            success "PASS (connection blocked as expected)"
            return 0
        else
            failure "FAIL (connection blocked but should have succeeded)"
            return 1
        fi
    fi
}

# Check if namespace exists
echo "1. Checking namespace..."
if kubectl get namespace $NAMESPACE &> /dev/null; then
    success "Namespace '$NAMESPACE' exists"
else
    failure "Namespace '$NAMESPACE' not found"
    exit 1
fi
echo ""

# Check network policies exist
echo "2. Checking network policies..."
EXPECTED_POLICIES=(
    "default-deny-all"
    "api-netpol"
    "ui-netpol"
    "policy-svc-netpol"
    "dnsdist-netpol"
    "postgres-netpol"
    "redis-netpol"
    "clickhouse-netpol"
    "unbound-netpol"
)

for policy in "${EXPECTED_POLICIES[@]}"; do
    if kubectl get networkpolicy -n $NAMESPACE $policy &> /dev/null; then
        success "Policy '$policy' exists"
    else
        failure "Policy '$policy' not found"
    fi
done
echo ""

# Get pod names
echo "3. Getting pod names..."
API_POD=$(kubectl get pod -n $NAMESPACE -l app=api -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
POLICY_POD=$(kubectl get pod -n $NAMESPACE -l app=policy-svc -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
UI_POD=$(kubectl get pod -n $NAMESPACE -l app=ui -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
DNSDIST_POD=$(kubectl get pod -n $NAMESPACE -l app=dnsdist -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "$API_POD" ]; then warning "No API pod found"; else success "API pod: $API_POD"; fi
if [ -z "$POLICY_POD" ]; then warning "No Policy Service pod found"; else success "Policy Service pod: $POLICY_POD"; fi
if [ -z "$UI_POD" ]; then warning "No UI pod found"; else success "UI pod: $UI_POD"; fi
if [ -z "$DNSDIST_POD" ]; then warning "No dnsdist pod found"; else success "dnsdist pod: $DNSDIST_POD"; fi
echo ""

# Test API connections
if [ ! -z "$API_POD" ]; then
    echo "4. Testing API pod connections..."

    # API should connect to PostgreSQL
    test_connection "$API_POD" "postgres" "5432" "true" "API → PostgreSQL (should succeed)"

    # API should connect to Redis
    test_connection "$API_POD" "redis" "6379" "true" "API → Redis (should succeed)"

    # API should connect to ClickHouse
    test_connection "$API_POD" "clickhouse" "8123" "true" "API → ClickHouse (should succeed)"

    echo ""
fi

# Test Policy Service connections
if [ ! -z "$POLICY_POD" ]; then
    echo "5. Testing Policy Service pod connections..."

    # Policy Service should connect to Redis
    test_connection "$POLICY_POD" "redis" "6379" "true" "Policy Service → Redis (should succeed)"

    # Policy Service should connect to ClickHouse
    test_connection "$POLICY_POD" "clickhouse" "8123" "true" "Policy Service → ClickHouse (should succeed)"

    # Policy Service should NOT connect to PostgreSQL
    test_connection "$POLICY_POD" "postgres" "5432" "false" "Policy Service → PostgreSQL (should fail)"

    echo ""
fi

# Test UI connections
if [ ! -z "$UI_POD" ]; then
    echo "6. Testing UI pod connections..."

    # UI should NOT connect to Redis
    test_connection "$UI_POD" "redis" "6379" "false" "UI → Redis (should fail)"

    # UI should NOT connect to PostgreSQL
    test_connection "$UI_POD" "postgres" "5432" "false" "UI → PostgreSQL (should fail)"

    # UI should NOT connect to API directly (goes through ingress)
    test_connection "$UI_POD" "api" "80" "false" "UI → API (should fail - uses browser)"

    echo ""
fi

# Test DNS resolution (all pods should be able to resolve DNS)
echo "7. Testing DNS resolution..."
if [ ! -z "$API_POD" ]; then
    if kubectl exec -n $NAMESPACE $API_POD -- nslookup kubernetes.default.svc.cluster.local &> /dev/null; then
        success "API pod can resolve DNS"
    else
        failure "API pod cannot resolve DNS"
    fi
fi

if [ ! -z "$POLICY_POD" ]; then
    if kubectl exec -n $NAMESPACE $POLICY_POD -- nslookup kubernetes.default.svc.cluster.local &> /dev/null; then
        success "Policy Service pod can resolve DNS"
    else
        failure "Policy Service pod cannot resolve DNS"
    fi
fi
echo ""

# Test default-deny by creating a temporary pod
echo "8. Testing default-deny policy..."
echo "Creating test pod..."
kubectl run test-netpol-pod --image=busybox -n $NAMESPACE --restart=Never -- sleep 30 &> /dev/null

# Wait for pod to be ready
sleep 3

# Test pod should NOT be able to connect to Redis
test_connection "test-netpol-pod" "redis" "6379" "false" "Test pod → Redis (should fail - default deny)"

# Test pod should NOT be able to connect to PostgreSQL
test_connection "test-netpol-pod" "postgres" "5432" "false" "Test pod → PostgreSQL (should fail - default deny)"

# Clean up test pod
echo "Cleaning up test pod..."
kubectl delete pod test-netpol-pod -n $NAMESPACE &> /dev/null
success "Test pod deleted"
echo ""

# Summary
echo "========================================="
echo "Verification Complete"
echo "========================================="
echo ""
echo "Network policies are enforcing traffic rules correctly."
echo "Review any failures above and adjust policies if needed."
echo ""
echo "To view all network policies:"
echo "  kubectl get networkpolicies -n $NAMESPACE"
echo ""
echo "To describe a specific policy:"
echo "  kubectl describe networkpolicy <policy-name> -n $NAMESPACE"
echo ""
