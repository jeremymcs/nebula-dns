#!/bin/bash
# Nebula DNS - Baseline Performance Report Generator
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Generates markdown-formatted performance baseline report from k6 JSON output
#
# Usage:
#   ./baseline-report.sh api-results.json
#   ./baseline-report.sh api-results.json dns-results.json
#   ./baseline-report.sh *.json

set -euo pipefail

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Install with: brew install jq" >&2
    exit 1
fi

# Check if at least one file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <k6-results.json> [<additional-results.json> ...]" >&2
    exit 1
fi

# Generate report header
cat << 'EOF'
# Load Test Baseline Report

EOF

echo "**Generated:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Process each JSON file
for result_file in "$@"; do
    if [ ! -f "$result_file" ]; then
        echo "Warning: File not found: $result_file" >&2
        continue
    fi

    # Extract test type from filename
    test_type=$(basename "$result_file" | sed 's/-results\.json$//' | sed 's/-load-test//')

    echo "## ${test_type^^} Load Test Results"
    echo ""

    # Extract scenario from metrics
    scenario=$(jq -r '.root_group.name // "unknown"' "$result_file" 2>/dev/null || echo "unknown")

    # Extract timestamp
    timestamp=$(jq -r '.state.testRunDurationMs // 0 | . / 1000 | tostring + "s"' "$result_file" 2>/dev/null || echo "N/A")

    echo "- **Test Scenario:** $scenario"
    echo "- **Duration:** $timestamp"
    echo ""

    # API-specific metrics
    if [[ "$test_type" == *"api"* ]]; then
        echo "### HTTP Request Metrics"
        echo ""
        echo "| Metric | Value |"
        echo "|--------|-------|"

        jq -r '
            .metrics.http_req_duration.values |
            "| p50 | \(.["p(50)"] | tostring)ms |",
            "| p95 | \(.["p(95)"] | tostring)ms |",
            "| p99 | \(.["p(99)"] | tostring)ms |",
            "| avg | \(.avg | tostring)ms |",
            "| max | \(.max | tostring)ms |"
        ' "$result_file" 2>/dev/null || echo "| N/A | N/A |"

        echo ""

        # Endpoint-specific metrics
        if jq -e '.metrics.login_duration' "$result_file" &>/dev/null; then
            echo "### Endpoint Latency"
            echo ""
            echo "| Endpoint | p50 | p95 | p99 |"
            echo "|----------|-----|-----|-----|"

            login_p50=$(jq -r '.metrics.login_duration.values["p(50)"] // 0' "$result_file")
            login_p95=$(jq -r '.metrics.login_duration.values["p(95)"] // 0' "$result_file")
            login_p99=$(jq -r '.metrics.login_duration.values["p(99)"] // 0' "$result_file")

            policies_p50=$(jq -r '.metrics.policies_duration.values["p(50)"] // 0' "$result_file")
            policies_p95=$(jq -r '.metrics.policies_duration.values["p(95)"] // 0' "$result_file")
            policies_p99=$(jq -r '.metrics.policies_duration.values["p(99)"] // 0' "$result_file")

            locations_p50=$(jq -r '.metrics.locations_duration.values["p(50)"] // 0' "$result_file")
            locations_p95=$(jq -r '.metrics.locations_duration.values["p(95)"] // 0' "$result_file")
            locations_p99=$(jq -r '.metrics.locations_duration.values["p(99)"] // 0' "$result_file")

            echo "| /auth/login | ${login_p50}ms | ${login_p95}ms | ${login_p99}ms |"
            echo "| /policies | ${policies_p50}ms | ${policies_p95}ms | ${policies_p99}ms |"
            echo "| /locations | ${locations_p50}ms | ${locations_p95}ms | ${locations_p99}ms |"
            echo ""
        fi

        # Error metrics
        error_rate=$(jq -r '(.metrics.errors.values.rate // 0) * 100' "$result_file")
        total_requests=$(jq -r '.metrics.http_reqs.values.count // 0' "$result_file")
        requests_per_sec=$(jq -r '.metrics.http_reqs.values.rate // 0' "$result_file")

        echo "### Traffic & Errors"
        echo ""
        echo "| Metric | Value |"
        echo "|--------|-------|"
        echo "| Total Requests | $total_requests |"
        echo "| Requests/sec | $(printf "%.2f" "$requests_per_sec") |"
        echo "| Error Rate | $(printf "%.3f" "$error_rate")% |"
        echo ""
    fi

    # DNS-specific metrics
    if [[ "$test_type" == *"dns"* ]]; then
        echo "### DNS Query Metrics"
        echo ""
        echo "| Metric | Value |"
        echo "|--------|-------|"

        jq -r '
            .metrics.dns_query_duration.values |
            "| p50 | \(.["p(50)"] | tostring)ms |",
            "| p95 | \(.["p(95)"] | tostring)ms |",
            "| p99 | \(.["p(99)"] | tostring)ms |",
            "| avg | \(.avg | tostring)ms |",
            "| max | \(.max | tostring)ms |"
        ' "$result_file" 2>/dev/null || echo "| N/A | N/A |"

        echo ""

        # Query distribution
        if jq -e '.metrics.blocked_queries and .metrics.allowed_queries' "$result_file" &>/dev/null; then
            blocked=$(jq -r '.metrics.blocked_queries.values.count // 0' "$result_file")
            allowed=$(jq -r '.metrics.allowed_queries.values.count // 0' "$result_file")
            total=$((blocked + allowed))

            if [ "$total" -gt 0 ]; then
                blocked_pct=$(awk "BEGIN {printf \"%.1f\", ($blocked / $total) * 100}")
                allowed_pct=$(awk "BEGIN {printf \"%.1f\", ($allowed / $total) * 100}")

                echo "### Query Distribution"
                echo ""
                echo "| Type | Count | Percentage |"
                echo "|------|-------|------------|"
                echo "| Allowed | $allowed | ${allowed_pct}% |"
                echo "| Blocked | $blocked | ${blocked_pct}% |"
                echo ""
            fi
        fi

        # DNS error metrics
        dns_error_rate=$(jq -r '(.metrics.dns_errors.values.rate // 0) * 100' "$result_file")
        total_queries=$(jq -r '.metrics.http_reqs.values.count // 0' "$result_file")
        qps=$(jq -r '.metrics.http_reqs.values.rate // 0' "$result_file")

        echo "### Traffic & Errors"
        echo ""
        echo "| Metric | Value |"
        echo "|--------|-------|"
        echo "| Total Queries | $total_queries |"
        echo "| QPS | $(printf "%.2f" "$qps") |"
        echo "| Error Rate | $(printf "%.3f" "$dns_error_rate")% |"
        echo ""
    fi

    echo "---"
    echo ""
done

# Summary footer
cat << 'EOF'
## SLO Compliance

| Service | Metric | SLO Target | Status |
|---------|--------|------------|--------|
| API | p95 latency | <200ms | See results above |
| API | Availability | 99.9% (errors <0.1%) | See results above |
| DNS | p95 latency | <100ms | See results above |
| DNS | Availability | 99.9% (errors <0.1%) | See results above |

**Note:** Compare actual values from results above to SLO targets to determine compliance.
EOF
