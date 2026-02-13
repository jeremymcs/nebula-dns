#!/usr/bin/env bash
# Nebula DNS - Infrastructure Verification
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Verifies that all provisioned infrastructure is accessible and healthy.
# Run after terraform apply and operator installation.
#
# Usage: ./verify-infrastructure.sh

set -euo pipefail

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local cmd="$2"
  printf "%-45s" "Checking ${name}..."
  if eval "${cmd}" >/dev/null 2>&1; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "FAIL"
    FAIL=$((FAIL + 1))
  fi
}

warn_check() {
  local name="$1"
  local cmd="$2"
  printf "%-45s" "Checking ${name}..."
  if eval "${cmd}" >/dev/null 2>&1; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "WARN"
    WARN=$((WARN + 1))
  fi
}

echo "=== Nebula DNS Infrastructure Verification ==="
echo ""

# --- Kubernetes Cluster ---
echo "--- DOKS Cluster ---"
check "kubectl connectivity" "kubectl cluster-info"
check "nodes ready (3+)" "test \$(kubectl get nodes --no-headers | grep -c Ready) -ge 3"
check "K8s version 1.30+" "kubectl version --short 2>/dev/null | grep -E 'Server.*1\.(3[0-9]|[4-9][0-9])' || kubectl version -o json | grep -E 'gitVersion.*v1\.(3[0-9]|[4-9][0-9])'"
check "nebula-dns namespace" "kubectl get namespace nebula-dns"

echo ""

# --- Kubernetes Operators ---
echo "--- Operators ---"
check "cert-manager pods running" "kubectl get pods -n cert-manager --no-headers | grep -c Running | grep -qE '^[3-9]'"
check "cert-manager webhook ready" "kubectl get deployment cert-manager-webhook -n cert-manager -o jsonpath='{.status.readyReplicas}' | grep -qE '[1-9]'"
check "ClusterIssuer letsencrypt-prod" "kubectl get clusterissuer letsencrypt-prod"
check "external-dns running" "kubectl get pods -n kube-system -l app.kubernetes.io/name=external-dns --no-headers | grep Running"

echo ""

# --- Kubernetes Secrets ---
echo "--- Secrets ---"
check "api-secrets exists" "kubectl get secret api-secrets -n nebula-dns"
check "policy-svc-secrets exists" "kubectl get secret policy-svc-secrets -n nebula-dns"
check "clickhouse-secrets exists" "kubectl get secret clickhouse-secrets -n nebula-dns"
warn_check "digitalocean-credentials exists" "kubectl get secret digitalocean-credentials -n kube-system"
warn_check "digitalocean-dns exists" "kubectl get secret digitalocean-dns -n cert-manager"

echo ""

# --- Database Connectivity (from within cluster) ---
echo "--- Database Connectivity ---"
echo "(These checks require port-forwarding or VPC access)"
warn_check "PostgreSQL secret has database-url" "kubectl get secret api-secrets -n nebula-dns -o jsonpath='{.data.database-url}' | base64 -d | grep -q postgresql"
warn_check "Valkey secret has redis-url" "kubectl get secret api-secrets -n nebula-dns -o jsonpath='{.data.redis-url}' | base64 -d | grep -q rediss"
warn_check "ClickHouse secret has host" "kubectl get secret clickhouse-secrets -n nebula-dns -o jsonpath='{.data.host}' | base64 -d | grep -q '.'"

echo ""

# --- Summary ---
echo "=== Summary ==="
echo "  PASS: ${PASS}"
echo "  FAIL: ${FAIL}"
echo "  WARN: ${WARN}"
echo ""

if [[ ${FAIL} -gt 0 ]]; then
  echo "RESULT: FAILED - ${FAIL} check(s) failed"
  exit 1
elif [[ ${WARN} -gt 0 ]]; then
  echo "RESULT: PASSED with warnings"
  exit 0
else
  echo "RESULT: ALL PASSED"
  exit 0
fi
