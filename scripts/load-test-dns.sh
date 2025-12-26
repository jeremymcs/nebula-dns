#!/bin/bash
# SafeDNS Load Testing Script
# Uses dnsperf to benchmark DNS query handling capacity

set -euo pipefail

# Configuration
DNS_SERVER="${DNS_SERVER:-127.0.0.1}"
DNS_PORT="${DNS_PORT:-53}"
DURATION="${DURATION:-60}"
CLIENTS="${CLIENTS:-10}"
QPS="${QPS:-1000}"
QUERY_FILE="${QUERY_FILE:-/tmp/dns-queries.txt}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Generate test queries if file doesn't exist
generate_queries() {
    log "Generating test query file..."
    cat > "$QUERY_FILE" << 'EOF'
google.com A
facebook.com A
twitter.com A
amazon.com A
microsoft.com A
apple.com A
netflix.com A
youtube.com A
linkedin.com A
github.com A
stackoverflow.com A
reddit.com A
wikipedia.org A
cloudflare.com A
aws.amazon.com A
mail.google.com A
drive.google.com A
docs.google.com A
api.github.com A
cdn.example.com A
malware.example.com A
phishing.example.com A
gambling.example.com A
adult.example.com A
ads.example.com A
tracker.example.com A
analytics.example.com A
EOF
    log "Generated $(wc -l < "$QUERY_FILE") test queries"
}

# Check if dnsperf is installed
check_dependencies() {
    if ! command -v dnsperf &> /dev/null; then
        log "ERROR: dnsperf is not installed"
        log "Install with: brew install dnsperf (macOS) or apt install dnsperf (Ubuntu)"
        exit 1
    fi
}

# Run basic load test
run_basic_test() {
    log "Running basic load test..."
    log "Server: $DNS_SERVER:$DNS_PORT"
    log "Duration: ${DURATION}s, Clients: $CLIENTS, Target QPS: $QPS"
    
    dnsperf \
        -s "$DNS_SERVER" \
        -p "$DNS_PORT" \
        -d "$QUERY_FILE" \
        -l "$DURATION" \
        -c "$CLIENTS" \
        -Q "$QPS" \
        -S 1
}

# Run stress test with increasing load
run_stress_test() {
    log "Running stress test with increasing load..."
    
    for qps in 100 500 1000 2000 5000 10000; do
        log "Testing at $qps QPS..."
        dnsperf \
            -s "$DNS_SERVER" \
            -p "$DNS_PORT" \
            -d "$QUERY_FILE" \
            -l 30 \
            -c "$CLIENTS" \
            -Q "$qps" \
            -S 1 2>&1 | tail -20
        
        log "Cooling down for 5 seconds..."
        sleep 5
    done
}

# Run latency test
run_latency_test() {
    log "Running latency test..."
    
    dnsperf \
        -s "$DNS_SERVER" \
        -p "$DNS_PORT" \
        -d "$QUERY_FILE" \
        -l 30 \
        -c 1 \
        -Q 100 \
        -S 1 \
        -v
}

# Main
main() {
    local test_type="${1:-basic}"
    
    check_dependencies
    
    if [ ! -f "$QUERY_FILE" ]; then
        generate_queries
    fi
    
    case "$test_type" in
        basic)
            run_basic_test
            ;;
        stress)
            run_stress_test
            ;;
        latency)
            run_latency_test
            ;;
        *)
            log "Usage: $0 [basic|stress|latency]"
            exit 1
            ;;
    esac
    
    log "Load test completed"
}

main "$@"

