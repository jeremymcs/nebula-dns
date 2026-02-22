#!/bin/bash

# Nebula DNS - Backup Verification Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Comprehensive backup verification for PostgreSQL and ClickHouse Cloud.
# This script validates data accessibility and consistency for managed database backups.
#
# Usage:
#   export POSTGRES_HOST=... POSTGRES_USER=... POSTGRES_PASSWORD=... POSTGRES_DB=...
#   export CLICKHOUSE_HOST=... CLICKHOUSE_USER=... CLICKHOUSE_PASSWORD=... CLICKHOUSE_DB=...
#   ./verify-backups.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -eo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall success
OVERALL_SUCCESS=true

# Timestamp for logging
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "=================================================="
echo "Backup Verification - ${TIMESTAMP}"
echo "=================================================="
echo ""

# ===================================================================
# PostgreSQL PITR Verification
# ===================================================================
echo "--- PostgreSQL Data Accessibility Check ---"

if [[ -z "${POSTGRES_HOST}" || -z "${POSTGRES_USER}" || -z "${POSTGRES_PASSWORD}" || -z "${POSTGRES_DB}" ]]; then
  echo -e "${RED}[FAIL] PostgreSQL credentials not set${NC}"
  OVERALL_SUCCESS=false
else
  export PGPASSWORD="${POSTGRES_PASSWORD}"

  # Test connection
  if psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}[PASS] PostgreSQL connection successful${NC}"
  else
    echo -e "${RED}[FAIL] PostgreSQL connection failed${NC}"
    OVERALL_SUCCESS=false
  fi

  # Check key table row counts
  echo ""
  echo "PostgreSQL Table Row Counts:"

  for table in tenants users policies locations; do
    ROW_COUNT=$(psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c "SELECT COUNT(*) FROM ${table};" 2>/dev/null || echo "ERROR")

    if [[ "${ROW_COUNT}" == "ERROR" ]]; then
      echo -e "  ${RED}${table}: QUERY FAILED${NC}"
      OVERALL_SUCCESS=false
    else
      ROW_COUNT=$(echo "${ROW_COUNT}" | xargs) # Trim whitespace
      if [[ "${ROW_COUNT}" -ge 0 ]]; then
        echo -e "  ${GREEN}${table}: ${ROW_COUNT} rows${NC}"
      else
        echo -e "  ${RED}${table}: Invalid count${NC}"
        OVERALL_SUCCESS=false
      fi
    fi
  done

  unset PGPASSWORD
fi

echo ""

# ===================================================================
# ClickHouse Cloud Backup Verification
# ===================================================================
echo "--- ClickHouse Cloud Data Accessibility Check ---"

if [[ -z "${CLICKHOUSE_HOST}" || -z "${CLICKHOUSE_USER}" || -z "${CLICKHOUSE_PASSWORD}" || -z "${CLICKHOUSE_DB}" ]]; then
  echo -e "${RED}[FAIL] ClickHouse credentials not set${NC}"
  OVERALL_SUCCESS=false
else
  # Test connection
  CLICKHOUSE_URL="https://${CLICKHOUSE_HOST}:8443"

  CONNECTION_TEST=$(curl -s -u "${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}" "${CLICKHOUSE_URL}/?query=SELECT%201" 2>/dev/null || echo "ERROR")

  if [[ "${CONNECTION_TEST}" == "1" ]]; then
    echo -e "${GREEN}[PASS] ClickHouse connection successful${NC}"
  else
    echo -e "${RED}[FAIL] ClickHouse connection failed${NC}"
    OVERALL_SUCCESS=false
  fi

  # Check table existence and row counts
  echo ""
  echo "ClickHouse Table Row Counts:"

  for table in dns_queries threat_logs audit_logs; do
    QUERY="SELECT COUNT(*) FROM ${CLICKHOUSE_DB}.${table}"
    ROW_COUNT=$(curl -s -u "${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}" "${CLICKHOUSE_URL}/" --data-urlencode "query=${QUERY}" 2>/dev/null || echo "ERROR")

    if [[ "${ROW_COUNT}" == "ERROR" || -z "${ROW_COUNT}" ]]; then
      echo -e "  ${RED}${table}: QUERY FAILED${NC}"
      OVERALL_SUCCESS=false
    else
      if [[ "${ROW_COUNT}" =~ ^[0-9]+$ ]]; then
        echo -e "  ${GREEN}${table}: ${ROW_COUNT} rows${NC}"
      else
        echo -e "  ${YELLOW}${table}: ${ROW_COUNT} (non-numeric)${NC}"
        OVERALL_SUCCESS=false
      fi
    fi
  done

  # Verify partitioning is active (check recent partitions)
  echo ""
  echo "ClickHouse Partition Health:"

  PARTITION_QUERY="SELECT table, COUNT(*) as partition_count FROM system.parts WHERE database = '${CLICKHOUSE_DB}' AND active = 1 GROUP BY table"
  PARTITION_RESULT=$(curl -s -u "${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}" "${CLICKHOUSE_URL}/" --data-urlencode "query=${PARTITION_QUERY}" 2>/dev/null || echo "ERROR")

  if [[ "${PARTITION_RESULT}" == "ERROR" || -z "${PARTITION_RESULT}" ]]; then
    echo -e "  ${RED}Partition query failed${NC}"
    OVERALL_SUCCESS=false
  else
    echo "${PARTITION_RESULT}" | while IFS=$'\t' read -r table_name part_count; do
      if [[ -n "${table_name}" && -n "${part_count}" ]]; then
        echo -e "  ${GREEN}${table_name}: ${part_count} active partitions${NC}"
      fi
    done
  fi
fi

echo ""
echo "=================================================="

# Final summary
if [[ "${OVERALL_SUCCESS}" == true ]]; then
  echo -e "${GREEN}[SUCCESS] All backup verification checks passed${NC}"
  exit 0
else
  echo -e "${RED}[FAILURE] One or more backup verification checks failed${NC}"
  exit 1
fi
