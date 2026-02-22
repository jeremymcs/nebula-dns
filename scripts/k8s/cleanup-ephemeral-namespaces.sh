#!/bin/bash
# Nebula DNS - Cleanup Ephemeral Namespaces
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

set -e

MAX_HOURS="${1:-4}"
DRY_RUN=false

if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    MAX_HOURS="${2:-4}"
fi

MAX_AGE_SECONDS=$((MAX_HOURS * 3600))
CURRENT_TIME=$(date +%s)

echo "[INFO] Cleaning up ephemeral namespaces older than ${MAX_HOURS} hours..."

NAMESPACES=$(kubectl get namespaces -l ephemeral=true -o json 2>/dev/null || echo '{"items": []}')

DELETED_COUNT=0
REMAINING_COUNT=0

for ns in $(echo "$NAMESPACES" | jq -r '.items[] | @base64'); do
    NS_NAME=$(echo "$ns" | base64 -d | jq -r '.metadata.name')
    CREATED_AT=$(echo "$ns" | base64 -d | jq -r '.metadata.labels["created-at"] // 0')
    
    AGE=$((CURRENT_TIME - CREATED_AT))
    
    if [ "$AGE" -gt "$MAX_AGE_SECONDS" ]; then
        if [ "$DRY_RUN" = true ]; then
            echo "[DRY-RUN] Would delete: ${NS_NAME} (age: $((AGE / 3600))h)"
        else
            echo "[INFO] Deleting: ${NS_NAME} (age: $((AGE / 3600))h)"
            kubectl delete namespace "$NS_NAME" --wait=false
            DELETED_COUNT=$((DELETED_COUNT + 1))
        fi
    else
        REMAINING_COUNT=$((REMAINING_COUNT + 1))
    fi
done

if [ "$DRY_RUN" = true ]; then
    echo "[INFO] Dry run complete. Would delete ${DELETED_COUNT} namespaces."
else
    echo "[OK] Deleted ${DELETED_COUNT} stale namespaces. ${REMAINING_COUNT} remaining."
fi
