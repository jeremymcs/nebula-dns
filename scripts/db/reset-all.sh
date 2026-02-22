#!/bin/bash
# Nebula DNS - Reset All Databases Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

set -e

SEED_DATA="${SEED_DATA:-false}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[INFO] Resetting all databases..."

START_TIME=$(date +%s)

if [ "$1" = "--sequential" ]; then
    echo "[INFO] Running in sequential mode..."
    
    echo "[INFO] Resetting PostgreSQL..."
    bash "$SCRIPT_DIR/reset-postgres.sh"
    
    echo "[INFO] Resetting Redis..."
    bash "$SCRIPT_DIR/reset-redis.sh"
    
    echo "[INFO] Resetting ClickHouse..."
    bash "$SCRIPT_DIR/reset-clickhouse.sh"
else
    bash "$SCRIPT_DIR/reset-postgres.sh" &
    PG_PID=$!
    
    bash "$SCRIPT_DIR/reset-redis.sh" &
    REDIS_PID=$!
    
    bash "$SCRIPT_DIR/reset-clickhouse.sh" &
    CH_PID=$!
    
    PG_FAIL=0
    REDIS_FAIL=0
    CH_FAIL=0
    
    wait $PG_PID || PG_FAIL=1
    wait $REDIS_PID || REDIS_FAIL=1
    wait $CH_PID || CH_FAIL=1
    
    if [ $PG_FAIL -ne 0 ]; then
        echo "[ERROR] PostgreSQL reset failed"
    fi
    
    if [ $REDIS_FAIL -ne 0 ]; then
        echo "[ERROR] Redis reset failed"
    fi
    
    if [ $CH_FAIL -ne 0 ]; then
        echo "[ERROR] ClickHouse reset failed"
    fi
    
    if [ $PG_FAIL -ne 0 ] || [ $REDIS_FAIL -ne 0 ] || [ $CH_FAIL -ne 0 ]; then
        echo "[ERROR] One or more resets failed"
        exit 1
    fi
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "[OK] All databases reset successfully in ${ELAPSED} seconds"
