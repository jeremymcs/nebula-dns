#!/usr/bin/env bash
# Nebula DNS - Kubernetes Operator Installation
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Installs cert-manager and external-dns on a DOKS cluster.
# Prerequisites: kubectl configured, helm installed, DO_TOKEN set.
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

if [[ -z "${DO_TOKEN:-}" ]]; then
  echo "ERROR: DO_TOKEN environment variable must be set"
  echo "Get it from: DigitalOcean Control Panel -> API -> Tokens"
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

# --- DigitalOcean credentials for external-dns and cert-manager ---
echo ""
echo "--- Creating DigitalOcean credentials secrets ---"

# Create namespace if not exists
kubectl create namespace nebula-dns ${DRY_RUN} 2>/dev/null || true

# Secret for external-dns
kubectl create secret generic digitalocean-credentials \
  --namespace kube-system \
  --from-literal=access-token="${DO_TOKEN}" \
  --dry-run=client -o yaml | kubectl apply ${DRY_RUN} -f -

# Secret for cert-manager DNS-01 solver
kubectl create secret generic digitalocean-dns \
  --namespace cert-manager \
  --from-literal=access-token="${DO_TOKEN}" \
  --dry-run=client -o yaml | kubectl apply ${DRY_RUN} -f -

echo "Secrets created successfully"

# --- external-dns ---
echo ""
echo "--- Installing external-dns ---"
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/ 2>/dev/null || true
helm repo update external-dns

helm upgrade --install external-dns external-dns/external-dns \
  --namespace kube-system \
  --values "${SCRIPT_DIR}/external-dns-values.yaml" \
  --wait \
  --timeout 5m \
  ${DRY_RUN}

echo "external-dns installed successfully"

# --- Apply ClusterIssuer ---
echo ""
echo "--- Applying cert-manager ClusterIssuer ---"
if [[ -z "${DRY_RUN}" ]]; then
  kubectl apply -f "${SCRIPT_DIR}/../../../k8s/base/cert-manager/cluster-issuer.yaml"
  echo "ClusterIssuer applied"
else
  echo "(skipped in dry-run mode)"
fi

echo ""
echo "=== All operators installed successfully ==="
echo ""
echo "Verify with:"
echo "  kubectl get pods -n cert-manager"
echo "  kubectl get pods -n kube-system -l app.kubernetes.io/name=external-dns"
echo "  kubectl get clusterissuers"
