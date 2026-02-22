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
command -v jq >/dev/null 2>&1 || { echo "jq required for JSON parsing"; exit 1; }

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
CH_HOST=$(echo "${CH_ENDPOINTS}" | jq -r '.https.host // empty')
CH_PORT=$(echo "${CH_ENDPOINTS}" | jq -r '.https.port // "8443"')

# Construct ClickHouse URL
if [[ -n "${CH_HOST}" ]]; then
  CLICKHOUSE_URL="https://${CH_HOST}:${CH_PORT}"
else
  CLICKHOUSE_URL=""
  echo "WARNING: clickhouse_endpoints not found in Terraform output"
fi

cd "${SCRIPT_DIR}"

# Validate we got values
if [[ -z "${PG_URI}" ]]; then
  echo "WARNING: postgres_connection_uri is empty. Have you run 'terraform apply'?"
  echo "You can also set secrets manually using the template:"
  echo "  cat ${SCRIPT_DIR}/secret-template.yaml"
  echo ""
fi

# Source ClickHouse credentials from Terraform with fallback prompts
echo "=== Sourcing ClickHouse Credentials ==="
cd "${TF_DIR}"

# Database name
CLICKHOUSE_DATABASE=$(terraform output -raw clickhouse_database 2>/dev/null || echo "")
if [[ -z "${CLICKHOUSE_DATABASE}" ]]; then
  read -p "Enter ClickHouse database name [nebula]: " CLICKHOUSE_DATABASE
  CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-nebula}"
fi

# Username
CLICKHOUSE_USER=$(terraform output -raw clickhouse_user 2>/dev/null || echo "")
if [[ -z "${CLICKHOUSE_USER}" ]]; then
  read -p "Enter ClickHouse username [default]: " CLICKHOUSE_USER
  CLICKHOUSE_USER="${CLICKHOUSE_USER:-default}"
fi

# Password
CLICKHOUSE_PASSWORD=$(terraform output -raw clickhouse_password 2>/dev/null || echo "")
if [[ -z "${CLICKHOUSE_PASSWORD}" ]]; then
  read -s -p "Enter ClickHouse password: " CLICKHOUSE_PASSWORD
  echo ""
fi

# URL (if not extracted from Terraform)
if [[ -z "${CLICKHOUSE_URL}" ]]; then
  read -p "Enter ClickHouse URL (e.g., https://example.clickhouse.cloud:8443): " CLICKHOUSE_URL
fi

# Validate password is not empty
if [[ -z "${CLICKHOUSE_PASSWORD}" ]]; then
  echo "ERROR: ClickHouse password cannot be empty"
  exit 1
fi

echo "Configured ClickHouse database: ${CLICKHOUSE_DATABASE}"
echo "Configured ClickHouse user: ${CLICKHOUSE_USER}"

cd "${SCRIPT_DIR}"

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
  --from-literal=clickhouse-url="${CLICKHOUSE_URL}" \
  --from-literal=clickhouse-database="${CLICKHOUSE_DATABASE}" \
  --from-literal=clickhouse-user="${CLICKHOUSE_USER}" \
  --from-literal=clickhouse-password="${CLICKHOUSE_PASSWORD}" \
  ${DRY_RUN} -o yaml | ${APPLY_CMD} ${DRY_RUN} -f -

echo "policy-svc-secrets created"

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
