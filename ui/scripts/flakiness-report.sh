#!/bin/bash
# Nebula DNS - Flakiness Report Script
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Parses Playwright test results and calculates flakiness metrics.
# A test is "flaky" if it failed on first attempt but passed on retry.
# Exits with code 1 if flakiness rate exceeds threshold.

set -eo pipefail

# Configuration
FLAKY_THRESHOLD="${FLAKY_THRESHOLD:-5}"
RESULTS_JSON="test-results/results.json"
JUNIT_XML="test-results/junit.xml"

# Output markdown summary table
echo "## Flakiness Report"
echo ""

# Check if JSON results exist (preferred)
if [ -f "$RESULTS_JSON" ]; then
  # Parse JSON results for flaky tests
  # Playwright JSON format has test results with status and retry information

  # Count totals using jq if available, otherwise fall back to basic parsing
  if command -v jq &> /dev/null; then
    # Use jq for accurate parsing
    TOTAL_TESTS=$(jq '[.suites[].specs[]] | length' "$RESULTS_JSON" 2>/dev/null || echo "0")

    # Flaky tests are those with status "flaky" (failed then passed on retry)
    FLAKY_TESTS=$(jq '[.suites[].specs[] | select(.tests[].results[] | .status == "passed" and .retry > 0)] | length' "$RESULTS_JSON" 2>/dev/null || echo "0")

    # Get test names for debugging
    FLAKY_TEST_NAMES=$(jq -r '[.suites[].specs[] | select(.tests[].results[] | .status == "passed" and .retry > 0) | .title] | join("\n")' "$RESULTS_JSON" 2>/dev/null || echo "")

  else
    # Fallback: basic grep parsing (less accurate)
    TOTAL_TESTS=$(grep -c '"title":' "$RESULTS_JSON" 2>/dev/null || echo "0")
    FLAKY_TESTS=$(grep -c '"retry": [1-9]' "$RESULTS_JSON" 2>/dev/null || echo "0")
    FLAKY_TEST_NAMES=""
  fi

elif [ -f "$JUNIT_XML" ]; then
  # Fallback to JUnit XML parsing
  # JUnit format has <testcase> elements, flaky tests have multiple <testcase> with same name

  # Count total unique test cases
  TOTAL_TESTS=$(grep -c '<testcase' "$JUNIT_XML" 2>/dev/null || echo "0")

  # Flaky tests: test cases that appear multiple times (retry) where final status is pass
  # This is a simplified heuristic - proper parsing would need XML tools
  FLAKY_TESTS=$(grep '<testcase' "$JUNIT_XML" | awk -F'"' '{print $2 " " $4}' | sort | uniq -c | awk '$1 > 1 {count++} END {print count+0}' 2>/dev/null || echo "0")
  FLAKY_TEST_NAMES=""

else
  # No results found
  echo "⚠️ **Warning:** No test results found"
  echo ""
  echo "Expected files:"
  echo "- $RESULTS_JSON (preferred)"
  echo "- $JUNIT_XML (fallback)"
  echo ""
  echo "Tests may not have run or output is in a different location."
  exit 0
fi

# Handle edge case: zero tests
if [ "$TOTAL_TESTS" -eq 0 ]; then
  echo "⚠️ **Warning:** Zero tests found in results"
  echo ""
  echo "This may indicate a test collection or execution issue."
  exit 0
fi

# Calculate flakiness rate
FLAKINESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($FLAKY_TESTS / $TOTAL_TESTS) * 100}")

# Output summary table
echo "| Metric | Value |"
echo "|--------|-------|"
echo "| Total Tests | $TOTAL_TESTS |"
echo "| Flaky Tests | $FLAKY_TESTS |"
echo "| Flakiness Rate | ${FLAKINESS_RATE}% |"
echo "| Threshold | ${FLAKY_THRESHOLD}% |"
echo ""

# List flaky tests if any
if [ "$FLAKY_TESTS" -gt 0 ] && [ -n "$FLAKY_TEST_NAMES" ]; then
  echo "### Flaky Tests (Failed then Passed on Retry)"
  echo ""
  echo '```'
  echo "$FLAKY_TEST_NAMES"
  echo '```'
  echo ""
fi

# Check threshold
if (( $(echo "$FLAKINESS_RATE > $FLAKY_THRESHOLD" | bc -l) )); then
  echo "❌ **FAILED:** Flakiness rate ${FLAKINESS_RATE}% exceeds threshold of ${FLAKY_THRESHOLD}%"
  echo ""
  echo "Action required: Investigate and fix flaky tests listed above."
  exit 1
else
  echo "✅ **PASSED:** Flakiness rate ${FLAKINESS_RATE}% is within threshold of ${FLAKY_THRESHOLD}%"
  exit 0
fi
