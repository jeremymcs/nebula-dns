#!/usr/bin/env bash
# Nebula DNS - Create Kubernetes Secrets from Terraform Outputs
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Reads database credentials from Terraform outputs and creates
# Kubernetes Secrets in the nebula-dns namespace.
#
# Prerequisites:
#   - kubectl configured with DOKS cluster context
#   - Terraform applied in infrastructure/terraform/environments/production/
#   - nebula-dns namespace exists
#
# Usage: ./create-secrets.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${SCRIPT_DIR}/../../terraform/environments/production"
NAMESPACE="nebula-dns"
DRY_RUN=""
APPLY_CMD="kubectl apply"

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run=client"
  echo "DRY RUN MODE - no changes will be applied"
fi

# Validate prerequisites
command -v kubectl >/dev/null 2>&1 || { echo "kubectl required"; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "terraform required"; exit 1; }

# Ensure namespace exists
kubectl create namespace "${NAMESPACE}" ${DRY_RUN} 2>/dev/null || true

echo "=== Reading Terraform Outputs ==="
cd "${TF_DIR}"

# PostgreSQL
PG_URI=$(terraform output -raw postgres_connection_uri 2>/dev/null || echo "")
PG_DIRECT_URI=$(terraform output -raw postgres_direct_uri 2>/dev/null || echo "")

# Valkey
VALKEY_URI=$(terraform output -raw valkey_connection_uri 2>/dev/null || echo "")

# ClickHouse (endpoints from ClickHouse Cloud)
CH_ENDPOINTS=$(terraform output -json clickhouse_endpoints 2>/dev/null || echo "{}")

cd "${SCRIPT_DIR}"

# Validate we got values
if [[ -z "${PG_URI}" ]]; then
  echo "WARNING: postgres_connection_uri is empty. Have you run 'terraform apply'?"
  echo "You can also set secrets manually using the template:"
  echo "  cat ${SCRIPT_DIR}/secret-template.yaml"
  echo ""
fi

echo "=== Creating Kubernetes Secrets ==="

# --- API Secrets ---
echo "Creating api-secrets..."
kubectl create secret generic api-secrets \
  --namespace "${NAMESPACE}" \
  --from-literal=database-url="${PG_URI}" \
  --from-literal=database-direct-url="${PG_DIRECT_URI}" \
  --from-literal=redis-url="${VALKEY_URI}" \
  --from-literal=jwt-secret="$(openssl rand -base64 48)" \
  --from-literal=jwt-refresh-secret="$(openssl rand -base64 48)" \
  --from-literal=admin-jwt-secret="$(openssl rand -base64 48)" \
  --from-literal=mfa-encryption-key="$(openssl rand -hex 32)" \
  --from-literal=sso-encryption-key="$(openssl rand -hex 32)" \
  --from-literal=siem-encryption-key="$(openssl rand -hex 32)" \
  ${DRY_RUN} -o yaml | ${APPLY_CMD} ${DRY_RUN} -f -

echo "api-secrets created"

# --- Policy Service Secrets ---
echo "Creating policy-svc-secrets..."
kubectl create secret generic policy-svc-secrets \
  --namespace "${NAMESPACE}" \
  --from-literal=redis-url="${VALKEY_URI}" \
  --from-literal=clickhouse-url="${CH_ENDPOINTS}" \
  ${DRY_RUN} -o yaml | ${APPLY_CMD} ${DRY_RUN} -f -

echo "policy-svc-secrets created"

# --- ClickHouse Secrets ---
echo "Creating clickhouse-secrets..."
kubectl create secret generic clickhouse-secrets \
  --namespace "${NAMESPACE}" \
  --from-literal=username="default" \
  --from-literal=password="" \
  --from-literal=host="" \
  --from-literal=port="8443" \
  ${DRY_RUN} -o yaml | ${APPLY_CMD} ${DRY_RUN} -f -

echo "clickhouse-secrets created (update username/password/host manually from ClickHouse Cloud console)"

# --- External Service Secrets (manual) ---
echo ""
echo "=== Manual Secrets Required ==="
echo "The following secrets must be set manually:"
echo ""
echo "  # Stripe (from Stripe Dashboard)"
echo "  kubectl -n ${NAMESPACE} create secret generic stripe-secrets \\"
echo "    --from-literal=secret-key='sk_...' \\"
echo "    --from-literal=webhook-secret='whsec_...'"
echo ""
echo "  # SendGrid (from SendGrid Dashboard)"
echo "  kubectl -n ${NAMESPACE} create secret generic sendgrid-secrets \\"
echo "    --from-literal=api-key='SG.xxx'"
echo ""
echo "  # Sentry (from Sentry Dashboard)"
echo "  kubectl -n ${NAMESPACE} create secret generic sentry-secrets \\"
echo "    --from-literal=dsn='https://xxx@sentry.io/xxx'"
echo ""
echo "=== Done ==="
