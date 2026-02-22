#!/bin/bash
# Nebula DNS - Create Ephemeral Test Namespace
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

set -e

IDENTIFIER="${1:-default}"
TTL_HOURS="${2:-4}"

TIMESTAMP=$(date +%s)
NAMESPACE="nebula-test-${IDENTIFIER}-${TIMESTAMP}"

NAMESPACE="${NAMESPACE:0:63}"

echo "[INFO] Creating ephemeral namespace: ${NAMESPACE}"

kubectl create namespace "$NAMESPACE"

kubectl label namespace "$NAMESPACE" \
    "ephemeral=true" \
    "identifier=${IDENTIFIER}" \
    "created-at=${TIMESTAMP}" \
    "ttl-hours=${TTL_HOURS}"

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: test-quota
  namespace: $NAMESPACE
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "5"
    services.loadbalancers: "0"
EOF

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: LimitRange
metadata:
  name: test-limits
  namespace: $NAMESPACE
spec:
  limits:
  - default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    type: Container
EOF

echo "[OK] Namespace ${NAMESPACE} created successfully"

echo "$NAMESPACE"

if [ -n "$GITHUB_OUTPUT" ]; then
    echo "namespace=$NAMESPACE" >> "$GITHUB_OUTPUT"
fi
