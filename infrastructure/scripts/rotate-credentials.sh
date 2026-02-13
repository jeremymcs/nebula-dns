#!/usr/bin/env bash
# Nebula DNS - Credential Rotation Runbook
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Step-by-step procedures for rotating credentials.
# Each rotation follows: generate new -> update secret -> restart pods -> verify
#
# Usage: ./rotate-credentials.sh <credential-type>
#
# Credential types:
#   jwt          - Rotate JWT signing secrets
#   encryption   - Rotate MFA/SSO/SIEM encryption keys
#   postgres     - Rotate PostgreSQL password (via DigitalOcean)
#   valkey       - Rotate Valkey password (via DigitalOcean)
#   clickhouse   - Rotate ClickHouse password (via ClickHouse Cloud)
#   do-token     - Rotate DigitalOcean API token
#   all-app      - Rotate all application secrets (jwt + encryption)

set -euo pipefail

NAMESPACE="nebula-dns"

usage() {
  echo "Usage: $0 <credential-type>"
  echo ""
  echo "Credential types:"
  echo "  jwt          Rotate JWT signing secrets (access, refresh, admin)"
  echo "  encryption   Rotate encryption keys (MFA, SSO, SIEM)"
  echo "  postgres     Rotate PostgreSQL password"
  echo "  valkey       Rotate Valkey password"
  echo "  clickhouse   Rotate ClickHouse Cloud password"
  echo "  do-token     Rotate DigitalOcean API token"
  echo "  all-app      Rotate all application-level secrets"
  echo ""
  echo "WARNING: Database credential rotation requires coordinated restart."
  echo "         Schedule during maintenance window."
  exit 1
}

rotate_jwt() {
  echo "=== Rotating JWT Secrets ==="
  echo ""
  echo "IMPACT: All active sessions will be invalidated."
  echo "DOWNTIME: Brief (pod restart ~30s)"
  echo ""
  read -p "Continue? (y/N) " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]] || exit 0

  echo "Generating new JWT secrets..."
  NEW_JWT=$(openssl rand -base64 48)
  NEW_REFRESH=$(openssl rand -base64 48)
  NEW_ADMIN=$(openssl rand -base64 48)

  echo "Updating api-secrets..."
  kubectl get secret api-secrets -n "${NAMESPACE}" -o json \
    | jq --arg jwt "$(echo -n "$NEW_JWT" | base64)" \
         --arg refresh "$(echo -n "$NEW_REFRESH" | base64)" \
         --arg admin "$(echo -n "$NEW_ADMIN" | base64)" \
         '.data["jwt-secret"]=$jwt | .data["jwt-refresh-secret"]=$refresh | .data["admin-jwt-secret"]=$admin' \
    | kubectl apply -f -

  echo "Restarting API pods..."
  kubectl rollout restart deployment/api -n "${NAMESPACE}"
  kubectl rollout status deployment/api -n "${NAMESPACE}" --timeout=120s

  echo "JWT secrets rotated successfully."
  echo "NOTE: All users will need to re-authenticate."
}

rotate_encryption() {
  echo "=== Rotating Encryption Keys ==="
  echo ""
  echo "WARNING: This will make existing encrypted data (MFA secrets, SSO configs,"
  echo "         SIEM credentials) unreadable. You must re-encrypt data first."
  echo ""
  echo "STEPS:"
  echo "  1. Run encryption migration script: npm run migrate-encryption"
  echo "  2. Then rotate the keys"
  echo "  3. Restart API pods"
  echo ""
  read -p "Have you run the encryption migration? (y/N) " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]] || { echo "Run migration first, then retry."; exit 1; }

  NEW_MFA=$(openssl rand -hex 32)
  NEW_SSO=$(openssl rand -hex 32)
  NEW_SIEM=$(openssl rand -hex 32)

  kubectl get secret api-secrets -n "${NAMESPACE}" -o json \
    | jq --arg mfa "$(echo -n "$NEW_MFA" | base64)" \
         --arg sso "$(echo -n "$NEW_SSO" | base64)" \
         --arg siem "$(echo -n "$NEW_SIEM" | base64)" \
         '.data["mfa-encryption-key"]=$mfa | .data["sso-encryption-key"]=$sso | .data["siem-encryption-key"]=$siem' \
    | kubectl apply -f -

  kubectl rollout restart deployment/api -n "${NAMESPACE}"
  kubectl rollout status deployment/api -n "${NAMESPACE}" --timeout=120s

  echo "Encryption keys rotated successfully."
}

rotate_postgres() {
  echo "=== Rotating PostgreSQL Password ==="
  echo ""
  echo "IMPACT: API will lose database connectivity during rotation."
  echo "DOWNTIME: ~1-2 minutes"
  echo "REQUIRES: doctl CLI authenticated"
  echo ""
  echo "STEPS:"
  echo "  1. Reset password in DigitalOcean:"
  echo "     doctl databases user reset <cluster-id> nebula"
  echo "  2. Get new connection URI from Terraform or DO Console"
  echo "  3. Update Kubernetes secret:"
  echo "     kubectl -n ${NAMESPACE} create secret generic api-secrets \\"
  echo "       --from-literal=database-url='NEW_URI' \\"
  echo "       --dry-run=client -o yaml | kubectl apply -f -"
  echo "  4. Update policy-svc-secrets if applicable"
  echo "  5. Restart affected pods:"
  echo "     kubectl rollout restart deployment/api -n ${NAMESPACE}"
  echo "  6. Verify connectivity:"
  echo "     kubectl logs deployment/api -n ${NAMESPACE} --tail=20"
}

rotate_valkey() {
  echo "=== Rotating Valkey Password ==="
  echo ""
  echo "IMPACT: Cache will be temporarily unavailable."
  echo "DOWNTIME: ~1-2 minutes"
  echo ""
  echo "STEPS:"
  echo "  1. Reset password in DigitalOcean:"
  echo "     doctl databases user reset <cluster-id> default"
  echo "  2. Get new connection URI"
  echo "  3. Update Kubernetes secrets (api-secrets AND policy-svc-secrets):"
  echo "     Update redis-url in both secrets"
  echo "  4. Restart affected pods:"
  echo "     kubectl rollout restart deployment/api -n ${NAMESPACE}"
  echo "     kubectl rollout restart deployment/policy-svc -n ${NAMESPACE}"
  echo "  5. Verify pub/sub connectivity:"
  echo "     kubectl logs deployment/policy-svc -n ${NAMESPACE} --tail=20"
}

rotate_clickhouse() {
  echo "=== Rotating ClickHouse Cloud Password ==="
  echo ""
  echo "STEPS:"
  echo "  1. Go to ClickHouse Cloud Console -> Service -> Settings -> Reset Password"
  echo "  2. Update clickhouse-secrets:"
  echo "     kubectl -n ${NAMESPACE} create secret generic clickhouse-secrets \\"
  echo "       --from-literal=username='default' \\"
  echo "       --from-literal=password='NEW_PASSWORD' \\"
  echo "       --from-literal=host='HOST' \\"
  echo "       --from-literal=port='8443' \\"
  echo "       --dry-run=client -o yaml | kubectl apply -f -"
  echo "  3. Update policy-svc-secrets with new clickhouse-url"
  echo "  4. Restart policy-svc:"
  echo "     kubectl rollout restart deployment/policy-svc -n ${NAMESPACE}"
}

rotate_do_token() {
  echo "=== Rotating DigitalOcean API Token ==="
  echo ""
  echo "STEPS:"
  echo "  1. Create new token in DO Console -> API -> Tokens"
  echo "  2. Update Terraform: export DIGITALOCEAN_TOKEN=new_token"
  echo "  3. Update cert-manager secret:"
  echo "     kubectl -n cert-manager create secret generic digitalocean-dns \\"
  echo "       --from-literal=access-token='NEW_TOKEN' \\"
  echo "       --dry-run=client -o yaml | kubectl apply -f -"
  echo "  4. Update external-dns secret:"
  echo "     kubectl -n kube-system create secret generic digitalocean-credentials \\"
  echo "       --from-literal=access-token='NEW_TOKEN' \\"
  echo "       --dry-run=client -o yaml | kubectl apply -f -"
  echo "  5. Restart cert-manager and external-dns:"
  echo "     kubectl rollout restart deployment/cert-manager -n cert-manager"
  echo "     kubectl rollout restart deployment/external-dns -n kube-system"
  echo "  6. Revoke old token in DO Console"
}

rotate_all_app() {
  rotate_jwt
  echo ""
  rotate_encryption
}

case "${1:-}" in
  jwt) rotate_jwt ;;
  encryption) rotate_encryption ;;
  postgres) rotate_postgres ;;
  valkey) rotate_valkey ;;
  clickhouse) rotate_clickhouse ;;
  do-token) rotate_do_token ;;
  all-app) rotate_all_app ;;
  *) usage ;;
esac
