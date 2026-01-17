#!/bin/bash
# Nebula DNS - PDB Verification Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# This script verifies Pod Disruption Budgets are properly configured
# and provides recommendations for maintaining high availability.

set -e

NAMESPACE="nebula-dns"
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}=== Nebula DNS - Pod Disruption Budget Verification ===${NC}\n"

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo -e "${RED}Error: Namespace '$NAMESPACE' does not exist${NC}"
    echo "Please deploy the application first: kubectl apply -k k8s/base/"
    exit 1
fi

# Check if PDBs exist
echo -e "${BOLD}1. Checking PDB Existence${NC}"
PDBS=("api-pdb" "policy-svc-pdb" "dnsdist-pdb" "ui-pdb")
for pdb in "${PDBS[@]}"; do
    if kubectl get pdb $pdb -n $NAMESPACE &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $pdb exists"
    else
        echo -e "  ${RED}✗${NC} $pdb not found"
    fi
done
echo ""

# Display PDB Status
echo -e "${BOLD}2. PDB Status Summary${NC}"
kubectl get pdb -n $NAMESPACE -o custom-columns=\
NAME:.metadata.name,\
MIN-AVAILABLE:.spec.minAvailable,\
CURRENT-HEALTHY:.status.currentHealthy,\
DESIRED-HEALTHY:.status.desiredHealthy,\
DISRUPTIONS-ALLOWED:.status.disruptionsAllowed,\
AGE:.metadata.creationTimestamp
echo ""

# Check HPA alignment
echo -e "${BOLD}3. HPA and PDB Alignment${NC}"
echo "Verifying HPA minReplicas > PDB minAvailable for each service..."
echo ""

check_alignment() {
    local service=$1
    local pdb_name=$2

    # Get PDB minAvailable
    local min_available=$(kubectl get pdb $pdb_name -n $NAMESPACE -o jsonpath='{.spec.minAvailable}' 2>/dev/null || echo "0")

    # Get HPA minReplicas (if exists)
    if kubectl get hpa $service -n $NAMESPACE &> /dev/null; then
        local min_replicas=$(kubectl get hpa $service -n $NAMESPACE -o jsonpath='{.spec.minReplicas}')
        local max_replicas=$(kubectl get hpa $service -n $NAMESPACE -o jsonpath='{.spec.maxReplicas}')

        echo -e "  ${BOLD}$service${NC}"
        echo "    HPA: min=$min_replicas, max=$max_replicas"
        echo "    PDB: minAvailable=$min_available"

        if [ "$min_replicas" -gt "$min_available" ]; then
            echo -e "    ${GREEN}✓${NC} Configuration allows disruptions"
        else
            echo -e "    ${YELLOW}⚠${NC} Warning: minReplicas should be > minAvailable"
            echo "      Recommended: Increase HPA minReplicas to $(($min_available + 1))"
        fi
    else
        # Check static deployment
        local replicas=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        echo -e "  ${BOLD}$service${NC}"
        echo "    Deployment: replicas=$replicas (static, no HPA)"
        echo "    PDB: minAvailable=$min_available"

        if [ "$replicas" -gt "$min_available" ]; then
            echo -e "    ${GREEN}✓${NC} Configuration allows disruptions"
        else
            echo -e "    ${YELLOW}⚠${NC} Warning: replicas should be > minAvailable"
        fi
    fi
    echo ""
}

check_alignment "api" "api-pdb"
check_alignment "policy-svc" "policy-svc-pdb"
check_alignment "dnsdist" "dnsdist-pdb"
check_alignment "ui" "ui-pdb"

# Verify selector matching
echo -e "${BOLD}4. Selector Matching${NC}"
echo "Verifying PDB selectors match pod labels..."
echo ""

check_selector() {
    local pdb_name=$1
    local app_label=$2

    # Get pods matching the selector
    local pod_count=$(kubectl get pods -n $NAMESPACE -l app=$app_label --no-headers 2>/dev/null | wc -l)

    echo -e "  ${BOLD}$pdb_name${NC}"
    echo "    Selector: app=$app_label"
    echo "    Matching pods: $pod_count"

    if [ "$pod_count" -gt 0 ]; then
        echo -e "    ${GREEN}✓${NC} Selector matches pods"
    else
        echo -e "    ${RED}✗${NC} No pods match selector"
    fi
    echo ""
}

check_selector "api-pdb" "api"
check_selector "policy-svc-pdb" "policy-svc"
check_selector "dnsdist-pdb" "dnsdist"
check_selector "ui-pdb" "ui"

# Check pod health
echo -e "${BOLD}5. Pod Health Status${NC}"
echo "Checking if all pods are healthy..."
echo ""

kubectl get pods -n $NAMESPACE -o custom-columns=\
NAME:.metadata.name,\
READY:.status.conditions[?(@.type==\"Ready\")].status,\
STATUS:.status.phase,\
RESTARTS:.status.containerStatuses[0].restartCount,\
AGE:.metadata.creationTimestamp
echo ""

# Recommendations
echo -e "${BOLD}6. Recommendations${NC}"

# Check for pods with high restart counts
high_restarts=$(kubectl get pods -n $NAMESPACE -o json | jq -r '.items[] | select(.status.containerStatuses[0].restartCount > 5) | .metadata.name' 2>/dev/null)
if [ -n "$high_restarts" ]; then
    echo -e "  ${YELLOW}⚠${NC} Pods with high restart counts detected:"
    echo "$high_restarts" | while read pod; do
        echo "    - $pod"
    done
    echo "    Action: Investigate pod stability before relying on PDBs"
    echo ""
fi

# Check disruptions allowed
zero_disruptions=$(kubectl get pdb -n $NAMESPACE -o json | jq -r '.items[] | select(.status.disruptionsAllowed == 0) | .metadata.name' 2>/dev/null)
if [ -n "$zero_disruptions" ]; then
    echo -e "  ${YELLOW}⚠${NC} PDBs with zero disruptions allowed:"
    echo "$zero_disruptions" | while read pdb; do
        echo "    - $pdb"
    done
    echo "    Action: Consider scaling up replicas to allow maintenance"
    echo ""
fi

# Final summary
echo -e "${BOLD}=== Summary ===${NC}"
echo "PDBs are configured to maintain high availability during voluntary disruptions."
echo "Critical services (policy-svc, dnsdist) have stricter requirements."
echo ""
echo "Next steps:"
echo "  1. Test with a controlled node drain: kubectl drain <node> --dry-run=client"
echo "  2. Monitor PDB metrics in Grafana"
echo "  3. Set up alerts for disruptionsAllowed == 0"
echo "  4. Review full documentation: k8s/base/pdbs/README.md"
echo ""
echo -e "${GREEN}Verification complete!${NC}"
