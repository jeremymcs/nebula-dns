#!/bin/bash
# Nebula DNS - Performance Regression Testing Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Compares k6 load test results against baseline to detect performance regressions
# Usage: ./compare-results.sh <baseline.json> <current.json>

set -e

BASELINE_FILE=$1
CURRENT_FILE=$2
THRESHOLD=${THRESHOLD:-10}  # Default 10% degradation threshold

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$BASELINE_FILE" ] || [ -z "$CURRENT_FILE" ]; then
    echo "Usage: $0 <baseline.json> <current.json>"
    echo "Example: $0 baseline-api.json current-api.json"
    echo ""
    echo "Environment variables:"
    echo "  THRESHOLD=10    Percentage degradation threshold (default: 10%)"
    exit 1
fi

if [ ! -f "$BASELINE_FILE" ]; then
    echo "Error: Baseline file not found: $BASELINE_FILE"
    exit 1
fi

if [ ! -f "$CURRENT_FILE" ]; then
    echo "Error: Current file not found: $CURRENT_FILE"
    exit 1
fi

echo "=========================================="
echo "Performance Regression Analysis"
echo "=========================================="
echo "Baseline: $BASELINE_FILE"
echo "Current:  $CURRENT_FILE"
echo "Threshold: ${THRESHOLD}% degradation"
echo ""

# Extract metrics using jq
extract_metric() {
    local file=$1
    local metric_name=$2
    local percentile=$3

    if [ -n "$percentile" ]; then
        # Extract percentile value (e.g., p(95))
        jq -r ".metrics[\"$metric_name\"].values[\"$percentile\"] // 0" "$file"
    else
        # Extract rate or count
        jq -r ".metrics[\"$metric_name\"].values.rate // .metrics[\"$metric_name\"].values.count // 0" "$file"
    fi
}

# Calculate percentage change
calc_change() {
    local baseline=$1
    local current=$2

    if [ "$baseline" == "0" ]; then
        echo "N/A"
        return
    fi

    echo "scale=2; (($current - $baseline) / $baseline) * 100" | bc
}

# Compare metric and return status
compare_metric() {
    local name=$1
    local baseline=$2
    local current=$3
    local inverse=$4  # For metrics where lower is worse (e.g., throughput)

    if [ "$baseline" == "0" ] || [ "$current" == "0" ]; then
        echo -e "${YELLOW}SKIP${NC}"
        return 2
    fi

    local change=$(calc_change "$baseline" "$current")
    if [ "$change" == "N/A" ]; then
        echo -e "${YELLOW}SKIP${NC}"
        return 2
    fi

    # Remove negative sign for comparison
    local abs_change=${change#-}

    # Check if regression (accounting for inverse metrics)
    local is_regression=false
    if [ "$inverse" == "true" ]; then
        # For throughput, negative change is bad
        if (( $(echo "$change < -$THRESHOLD" | bc -l) )); then
            is_regression=true
        fi
    else
        # For latency/errors, positive change is bad
        if (( $(echo "$change > $THRESHOLD" | bc -l) )); then
            is_regression=true
        fi
    fi

    if [ "$is_regression" == "true" ]; then
        echo -e "${RED}FAIL${NC} (${change}%)"
        return 1
    else
        echo -e "${GREEN}PASS${NC} (${change}%)"
        return 0
    fi
}

# Track overall status
EXIT_CODE=0

echo "Metric Comparison:"
echo "=========================================="
printf "%-30s %-15s %-15s %-15s\n" "Metric" "Baseline" "Current" "Status"
echo "=========================================="

# HTTP Request Duration (latency)
baseline_p50=$(extract_metric "$BASELINE_FILE" "http_req_duration" "p(50)")
current_p50=$(extract_metric "$CURRENT_FILE" "http_req_duration" "p(50)")
status=$(compare_metric "P50 Latency" "$baseline_p50" "$current_p50" "false")
printf "%-30s %-15.2f %-15.2f %b\n" "P50 Latency (ms)" "$baseline_p50" "$current_p50" "$status"
[ $? -eq 1 ] && EXIT_CODE=1

baseline_p95=$(extract_metric "$BASELINE_FILE" "http_req_duration" "p(95)")
current_p95=$(extract_metric "$CURRENT_FILE" "http_req_duration" "p(95)")
status=$(compare_metric "P95 Latency" "$baseline_p95" "$current_p95" "false")
printf "%-30s %-15.2f %-15.2f %b\n" "P95 Latency (ms)" "$baseline_p95" "$current_p95" "$status"
[ $? -eq 1 ] && EXIT_CODE=1

baseline_p99=$(extract_metric "$BASELINE_FILE" "http_req_duration" "p(99)")
current_p99=$(extract_metric "$CURRENT_FILE" "http_req_duration" "p(99)")
status=$(compare_metric "P99 Latency" "$baseline_p99" "$current_p99" "false")
printf "%-30s %-15.2f %-15.2f %b\n" "P99 Latency (ms)" "$baseline_p99" "$current_p99" "$status"
[ $? -eq 1 ] && EXIT_CODE=1

# Error Rate
baseline_errors=$(extract_metric "$BASELINE_FILE" "errors" "")
current_errors=$(extract_metric "$CURRENT_FILE" "errors" "")
status=$(compare_metric "Error Rate" "$baseline_errors" "$current_errors" "false")
printf "%-30s %-15.4f %-15.4f %b\n" "Error Rate" "$baseline_errors" "$current_errors" "$status"
[ $? -eq 1 ] && EXIT_CODE=1

# Throughput (RPS)
baseline_rps=$(extract_metric "$BASELINE_FILE" "http_reqs" "")
current_rps=$(extract_metric "$CURRENT_FILE" "http_reqs" "")
status=$(compare_metric "Throughput (RPS)" "$baseline_rps" "$current_rps" "true")
printf "%-30s %-15.2f %-15.2f %b\n" "Throughput (RPS)" "$baseline_rps" "$current_rps" "$status"
[ $? -eq 1 ] && EXIT_CODE=1

# Custom Metrics (if present)
echo ""
echo "Custom Metrics:"
echo "=========================================="

# Login Duration
baseline_login=$(extract_metric "$BASELINE_FILE" "login_duration" "p(95)")
current_login=$(extract_metric "$CURRENT_FILE" "login_duration" "p(95)")
if [ "$baseline_login" != "0" ] && [ "$current_login" != "0" ]; then
    status=$(compare_metric "Login P95 (ms)" "$baseline_login" "$current_login" "false")
    printf "%-30s %-15.2f %-15.2f %b\n" "Login P95 (ms)" "$baseline_login" "$current_login" "$status"
    [ $? -eq 1 ] && EXIT_CODE=1
fi

# Policies Duration
baseline_policies=$(extract_metric "$BASELINE_FILE" "policies_duration" "p(95)")
current_policies=$(extract_metric "$CURRENT_FILE" "policies_duration" "p(95)")
if [ "$baseline_policies" != "0" ] && [ "$current_policies" != "0" ]; then
    status=$(compare_metric "Policies P95 (ms)" "$baseline_policies" "$current_policies" "false")
    printf "%-30s %-15.2f %-15.2f %b\n" "Policies P95 (ms)" "$baseline_policies" "$current_policies" "$status"
    [ $? -eq 1 ] && EXIT_CODE=1
fi

# DNS Query Duration (if DNS test)
baseline_dns=$(extract_metric "$BASELINE_FILE" "dns_query_duration" "p(95)")
current_dns=$(extract_metric "$CURRENT_FILE" "dns_query_duration" "p(95)")
if [ "$baseline_dns" != "0" ] && [ "$current_dns" != "0" ]; then
    status=$(compare_metric "DNS Query P95 (ms)" "$baseline_dns" "$current_dns" "false")
    printf "%-30s %-15.2f %-15.2f %b\n" "DNS Query P95 (ms)" "$baseline_dns" "$current_dns" "$status"
    [ $? -eq 1 ] && EXIT_CODE=1
fi

echo "=========================================="
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ No performance regression detected${NC}"
    echo "All metrics are within ${THRESHOLD}% of baseline."
else
    echo -e "${RED}✗ Performance regression detected${NC}"
    echo "One or more metrics degraded by more than ${THRESHOLD}%."
    echo ""
    echo "Recommendations:"
    echo "  1. Review recent code changes"
    echo "  2. Check for database query regressions"
    echo "  3. Verify resource allocation (CPU, memory)"
    echo "  4. Profile application under load (pprof, flame graphs)"
    echo "  5. Compare system metrics (CPU, memory, disk I/O)"
fi

echo ""
echo "Detailed comparison:"
echo "  diff <(jq -S . $BASELINE_FILE) <(jq -S . $CURRENT_FILE)"

exit $EXIT_CODE
