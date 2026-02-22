#!/usr/bin/env bash
# Nebula DNS - Kubernetes Operator Installation
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Installs cert-manager on a DOKS cluster.
# DNS is managed in Cloudflare — external-dns is NOT used.
#
# Prerequisites: kubectl configured, helm installed, CLOUDFLARE_API_TOKEN set.
#
# Usage: ./install-operators.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=""

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "DRY RUN MODE - no changes will be applied"
fi

# Validate prerequisites
command -v kubectl >/dev/null 2>&1 || { echo "kubectl required but not found"; exit 1; }
command -v helm >/dev/null 2>&1 || { echo "helm required but not found"; exit 1; }

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN environment variable must be set"
  echo "Token requires: Zone:DNS:Edit + Zone:Zone:Read for nebuladns.io"
  exit 1
fi

echo "=== Installing Kubernetes Operators ==="

# --- cert-manager ---
echo ""
echo "--- Installing cert-manager ---"
helm repo add jetstack https://charts.jetstack.io 2>/dev/null || true
helm repo update jetstack

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.0 \
  --values "${SCRIPT_DIR}/cert-manager-values.yaml" \
  --wait \
  --timeout 5m \
  ${DRY_RUN}

echo "cert-manager installed successfully"

# Wait for cert-manager webhook to be ready
if [[ -z "${DRY_RUN}" ]]; then
  echo "Waiting for cert-manager webhook..."
  kubectl wait --for=condition=Available deployment/cert-manager-webhook \
    -n cert-manager --timeout=120s
fi

# --- Cloudflare API token secret for DNS-01 ---
echo ""
echo "--- Creating Cloudflare DNS-01 secret ---"

kubectl create namespace nebula-dns 2>/dev/null || true

kubectl create secret generic cloudflare-api-token \
  --namespace cert-manager \
  --from-literal=api-token="${CLOUDFLARE_API_TOKEN}" \
  --dry-run=client -o yaml | kubectl apply ${DRY_RUN} -f -

echo "Cloudflare secret created in cert-manager namespace"

# --- Apply ClusterIssuer ---
echo ""
echo "--- Applying cert-manager ClusterIssuer ---"
if [[ -z "${DRY_RUN}" ]]; then
  kubectl apply -f "${SCRIPT_DIR}/../../../k8s/base/cert-manager/cluster-issuer.yaml"
  echo "ClusterIssuers applied"
else
  echo "(skipped in dry-run mode)"
fi

echo ""
echo "=== Operators installed successfully ==="
echo ""
echo "Verify with:"
echo "  kubectl get pods -n cert-manager"
echo "  kubectl get clusterissuers"
echo ""
echo "NOTE: DNS records must be created manually in Cloudflare."
echo "      See Phase 12 of the go-live plan."
