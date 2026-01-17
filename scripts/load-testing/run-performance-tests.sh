#!/bin/bash
# Nebula DNS - Comprehensive Performance Test Runner
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
#
# Orchestrates complete performance testing workflow:
# 1. Pre-flight checks (services healthy)
# 2. Run API load tests
# 3. Run DNS load tests
# 4. Compare against baseline
# 5. Generate reports
#
# Usage: ./run-performance-tests.sh [--baseline] [--compare] [--smoke]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/load-test-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Configuration
API_URL=${API_URL:-http://localhost:4010}
DOH_URL=${DOH_URL:-https://localhost:4443/dns-query}
TEST_EMAIL=${TEST_EMAIL:-admin@example.com}
TEST_PASSWORD=${TEST_PASSWORD:-password123}

MODE="full"
COMPARE_BASELINE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --baseline)
            echo "Running in BASELINE mode (results will be saved as new baseline)"
            MODE="baseline"
            shift
            ;;
        --compare)
            echo "Running in COMPARE mode (results will be compared against baseline)"
            COMPARE_BASELINE=true
            shift
            ;;
        --smoke)
            echo "Running in SMOKE TEST mode (quick validation only)"
            MODE="smoke"
            shift
            ;;
        --help)
            echo "Usage: $0 [--baseline] [--compare] [--smoke]"
            echo ""
            echo "Options:"
            echo "  --baseline  Save results as new baseline for future comparisons"
            echo "  --compare   Compare results against existing baseline"
            echo "  --smoke     Run quick smoke tests only (30s duration)"
            echo ""
            echo "Environment variables:"
            echo "  API_URL         API endpoint (default: http://localhost:4010)"
            echo "  DOH_URL         DNS over HTTPS endpoint (default: https://localhost:4443/dns-query)"
            echo "  TEST_EMAIL      Test user email (default: admin@example.com)"
            echo "  TEST_PASSWORD   Test user password (default: password123)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed"
        echo ""
        echo "Install k6 using one of the following methods:"
        echo ""
        echo "macOS (Homebrew):"
        echo "  brew install k6"
        echo ""
        echo "Linux (Debian/Ubuntu):"
        echo "  sudo gpg -k"
        echo "  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
        echo "  echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' | sudo tee /etc/apt/sources.list.d/k6.list"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install k6"
        echo ""
        echo "Docker:"
        echo "  alias k6='docker run --rm -i --network=host grafana/k6'"
        echo ""
        echo "Visit https://k6.io/docs/getting-started/installation/ for more options"
        exit 1
    fi
}

# Check if services are healthy
check_services() {
    log_info "Checking service health..."

    local services_ok=true

    # Check API
    if curl -sf "$API_URL/health" > /dev/null 2>&1; then
        log_success "API is healthy ($API_URL)"
    else
        log_error "API is not responding ($API_URL)"
        services_ok=false
    fi

    # Check if we can authenticate
    local auth_response=$(curl -sf -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" 2>/dev/null || echo "")

    if echo "$auth_response" | grep -q "accessToken"; then
        log_success "Authentication is working"
    else
        log_warning "Authentication failed - tests may fail (check TEST_EMAIL and TEST_PASSWORD)"
    fi

    # Check Docker services
    if command -v docker &> /dev/null; then
        local running_services=$(docker ps --filter "name=dnsfilter" --format "{{.Names}}" | wc -l)
        if [ "$running_services" -gt 0 ]; then
            log_success "$running_services Docker services are running"
        else
            log_warning "No dnsfilter Docker services found running"
            log_info "Start services with: docker-compose up -d"
        fi
    fi

    if [ "$services_ok" = false ]; then
        log_error "Service health check failed"
        exit 1
    fi
}

# Create results directory
create_results_dir() {
    mkdir -p "$RESULTS_DIR"
    log_info "Results will be saved to: $RESULTS_DIR"
}

# Run API load test
run_api_test() {
    log_info "Starting API load test..."

    local output_file="$RESULTS_DIR/api-test-$TIMESTAMP.json"
    local summary_file="$RESULTS_DIR/api-test-$TIMESTAMP-summary.txt"

    export API_URL TEST_EMAIL TEST_PASSWORD

    if [ "$MODE" == "smoke" ]; then
        log_info "Running smoke test only (30s duration)"
        k6 run --include-scenario=smoke \
            "$SCRIPT_DIR/api-load-test.js" \
            --out json="$output_file" \
            | tee "$summary_file"
    else
        k6 run "$SCRIPT_DIR/api-load-test.js" \
            --out json="$output_file" \
            | tee "$summary_file"
    fi

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        log_success "API load test completed successfully"
    else
        log_error "API load test failed with exit code $exit_code"
        return $exit_code
    fi

    # Save as baseline if requested
    if [ "$MODE" == "baseline" ]; then
        cp "$output_file" "$RESULTS_DIR/baseline-api.json"
        log_success "Saved as baseline: $RESULTS_DIR/baseline-api.json"
    fi

    # Compare against baseline if requested
    if [ "$COMPARE_BASELINE" = true ] && [ -f "$RESULTS_DIR/baseline-api.json" ]; then
        log_info "Comparing against baseline..."
        if "$SCRIPT_DIR/compare-results.sh" "$RESULTS_DIR/baseline-api.json" "$output_file"; then
            log_success "No performance regression detected"
        else
            log_error "Performance regression detected!"
            return 1
        fi
    fi

    return 0
}

# Run DNS load test
run_dns_test() {
    log_info "Starting DNS load test..."

    local output_file="$RESULTS_DIR/dns-test-$TIMESTAMP.json"
    local summary_file="$RESULTS_DIR/dns-test-$TIMESTAMP-summary.txt"

    export DOH_URL

    if [ "$MODE" == "smoke" ]; then
        log_info "Skipping DNS test in smoke mode"
        return 0
    fi

    # Check if DoH endpoint is accessible
    if ! curl -sf "$DOH_URL" > /dev/null 2>&1; then
        log_warning "DoH endpoint not accessible, skipping DNS test"
        log_info "Start dnsdist service to enable DNS testing"
        return 0
    fi

    k6 run "$SCRIPT_DIR/dns-load-test.js" \
        --out json="$output_file" \
        | tee "$summary_file"

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        log_success "DNS load test completed successfully"
    else
        log_error "DNS load test failed with exit code $exit_code"
        return $exit_code
    fi

    # Save as baseline if requested
    if [ "$MODE" == "baseline" ]; then
        cp "$output_file" "$RESULTS_DIR/baseline-dns.json"
        log_success "Saved as baseline: $RESULTS_DIR/baseline-dns.json"
    fi

    # Compare against baseline if requested
    if [ "$COMPARE_BASELINE" = true ] && [ -f "$RESULTS_DIR/baseline-dns.json" ]; then
        log_info "Comparing against baseline..."
        if "$SCRIPT_DIR/compare-results.sh" "$RESULTS_DIR/baseline-dns.json" "$output_file"; then
            log_success "No performance regression detected"
        else
            log_error "Performance regression detected!"
            return 1
        fi
    fi

    return 0
}

# Generate HTML report
generate_report() {
    log_info "Generating performance report..."

    local report_file="$RESULTS_DIR/report-$TIMESTAMP.html"

    cat > "$report_file" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Nebula DNS - Performance Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 1200px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }
        h2 {
            color: #555;
            margin-top: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .metric-good { color: #28a745; font-weight: bold; }
        .metric-warn { color: #ffc107; font-weight: bold; }
        .metric-bad { color: #dc3545; font-weight: bold; }
        .summary {
            background: #e7f3ff;
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Nebula DNS - Performance Test Report</h1>

        <div class="summary">
            <h3>Test Summary</h3>
            <p><strong>Date:</strong> $(date)</p>
            <p><strong>Mode:</strong> $MODE</p>
            <p><strong>API URL:</strong> $API_URL</p>
            <p><strong>DoH URL:</strong> $DOH_URL</p>
        </div>

        <h2>API Performance Metrics</h2>
        <p>See detailed results in: <code>$RESULTS_DIR/api-test-$TIMESTAMP.json</code></p>

        <h2>DNS Performance Metrics</h2>
        <p>See detailed results in: <code>$RESULTS_DIR/dns-test-$TIMESTAMP.json</code></p>

        <h2>System Information</h2>
        <table>
            <tr>
                <th>Component</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>OS</td>
                <td>$(uname -s) $(uname -r)</td>
            </tr>
            <tr>
                <td>CPU Cores</td>
                <td>$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "Unknown")</td>
            </tr>
            <tr>
                <td>Total Memory</td>
                <td>$(free -h 2>/dev/null | awk '/^Mem:/ {print $2}' || sysctl -n hw.memsize 2>/dev/null | awk '{print $1/1024/1024/1024 " GB"}' || echo "Unknown")</td>
            </tr>
        </table>

        <div class="footer">
            <p>Generated by Nebula DNS Performance Testing Suite</p>
            <p>Copyright (c) 2026 Jeremy McSpadden &lt;jeremy@fluxlabs.net&gt;</p>
        </div>
    </div>
</body>
</html>
EOF

    log_success "Report generated: $report_file"

    # Try to open report in browser
    if command -v open &> /dev/null; then
        open "$report_file"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$report_file"
    fi
}

# Cleanup old results (keep last 10)
cleanup_old_results() {
    log_info "Cleaning up old test results..."

    cd "$RESULTS_DIR" || return

    # Keep last 10 JSON results
    ls -t api-test-*.json 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    ls -t dns-test-*.json 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

    # Keep last 10 summaries
    ls -t api-test-*-summary.txt 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    ls -t dns-test-*-summary.txt 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

    # Keep last 10 reports
    ls -t report-*.html 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

    log_success "Cleanup completed"
}

# Main execution
main() {
    echo "=========================================="
    echo "Nebula DNS - Performance Test Suite"
    echo "=========================================="
    echo ""

    check_k6
    create_results_dir
    check_services

    echo ""
    log_info "Starting performance tests..."
    echo ""

    local overall_status=0

    # Run API test
    if ! run_api_test; then
        overall_status=1
    fi

    echo ""

    # Run DNS test
    if ! run_dns_test; then
        overall_status=1
    fi

    echo ""

    # Generate report
    generate_report

    # Cleanup old results
    cleanup_old_results

    echo ""
    echo "=========================================="
    if [ $overall_status -eq 0 ]; then
        log_success "All performance tests completed successfully!"
    else
        log_error "Some performance tests failed or regressed"
    fi
    echo "=========================================="
    echo ""
    log_info "Results saved to: $RESULTS_DIR"

    # Show summary
    echo ""
    echo "Quick Summary:"
    if [ -f "$RESULTS_DIR/api-test-$TIMESTAMP-summary.txt" ]; then
        echo ""
        echo "API Test Results:"
        tail -20 "$RESULTS_DIR/api-test-$TIMESTAMP-summary.txt"
    fi

    exit $overall_status
}

# Run main function
main
