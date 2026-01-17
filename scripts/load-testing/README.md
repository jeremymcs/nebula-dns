# Load Testing Suite

## Nebula DNS - Performance Testing Documentation
Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Overview

This directory contains comprehensive load testing scripts for Nebula DNS, designed to establish performance baselines, detect regressions, and validate system capacity.

## Prerequisites

### Install k6

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
alias k6='docker run --rm -i --network=host grafana/k6'
```

**Other platforms:** Visit https://k6.io/docs/getting-started/installation/

### Start Services

```bash
# From project root
docker-compose up -d

# Verify services are healthy
docker-compose ps
curl http://localhost:4010/health
```

## Quick Start

### Run All Tests

```bash
# Run comprehensive performance tests
./run-performance-tests.sh

# Run smoke tests only (quick validation)
./run-performance-tests.sh --smoke

# Establish baseline
./run-performance-tests.sh --baseline

# Compare against baseline (for CI/CD)
./run-performance-tests.sh --compare
```

### Run Individual Tests

**API Load Test:**
```bash
export API_URL=http://localhost:4010
export TEST_EMAIL=admin@example.com
export TEST_PASSWORD=password123

k6 run api-load-test.js
```

**DNS Load Test:**
```bash
export DOH_URL=https://localhost:4443/dns-query

k6 run dns-load-test.js
```

## Test Scripts

### 1. api-load-test.js

Tests the NestJS API control plane with three scenarios:

**Smoke Test (30s):**
- 1 virtual user
- Validates basic functionality
- Quick sanity check

**Load Test (16m):**
- Ramps from 0 to 100 VUs
- Simulates normal production load
- Target: 1000 RPS sustained

**Stress Test (22m):**
- Ramps from 100 to 300 VUs
- Finds breaking point
- Identifies bottlenecks

**Metrics:**
- `http_req_duration`: Overall request latency
- `login_duration`: Authentication performance
- `policies_duration`: Policy API performance
- `locations_duration`: Location API performance
- `errors`: Error rate

**Thresholds:**
- P95 latency: <500ms
- P99 latency: <1000ms
- Error rate: <1%

**Tested Endpoints:**
- POST /auth/login
- GET /policies
- GET /locations
- GET /reports/summary

### 2. dns-load-test.js

Tests the DNS data plane (dnsdist → Policy Service → Unbound) with two scenarios:

**Sustained Test (5m):**
- 1,000 queries/second
- Tests steady-state performance
- Validates cache efficiency

**Spike Test (4m):**
- Ramps to 5,000 QPS spike
- Tests burst handling
- Validates auto-scaling

**Metrics:**
- `dns_query_duration`: End-to-end DNS resolution time
- `dns_errors`: SERVFAIL and timeout rate
- `blocked_queries`: Count of blocked domains
- `allowed_queries`: Count of allowed domains

**Thresholds:**
- P50 latency: <50ms
- P95 latency: <100ms
- P99 latency: <200ms
- Error rate: <0.1%

**Test Domains:**
- Legitimate domains (google.com, github.com, etc.)
- Test blocked domains (malware-test.example.com, etc.)

### 3. run-performance-tests.sh

Orchestrator script that runs complete test suite:

**Features:**
- Pre-flight service health checks
- Runs API and DNS tests sequentially
- Compares against baseline
- Generates HTML report
- Cleans up old results (keeps last 10)

**Options:**
```bash
--baseline   # Save results as new baseline
--compare    # Compare against existing baseline
--smoke      # Quick validation only
```

**Example Usage:**
```bash
# Weekly regression test (in CI/CD)
./run-performance-tests.sh --compare

# After performance optimization
./run-performance-tests.sh --baseline

# Pre-deployment check
./run-performance-tests.sh --smoke
```

### 4. compare-results.sh

Compares two k6 JSON result files to detect performance regressions.

**Usage:**
```bash
./compare-results.sh baseline.json current.json

# With custom threshold
THRESHOLD=5 ./compare-results.sh baseline.json current.json
```

**Compared Metrics:**
- P50, P95, P99 latency (alerts if >10% slower)
- Error rate (alerts if >0.5% increase)
- Throughput (alerts if >10% decrease)
- Custom metrics (login, policies, DNS queries)

**Exit Codes:**
- 0: No regression detected
- 1: Regression detected
- 2: Comparison skipped (missing data)

**CI/CD Integration:**
```yaml
# GitHub Actions example
- name: Run performance tests
  run: ./scripts/load-testing/run-performance-tests.sh --compare

- name: Upload results
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: load-test-results
    path: load-test-results/
```

## Performance Targets

### API (Control Plane)

| Metric | Target | Excellent | Poor |
|--------|--------|-----------|------|
| P50 Latency | <100ms | <50ms | >200ms |
| P95 Latency | <500ms | <200ms | >1000ms |
| P99 Latency | <1000ms | <500ms | >2000ms |
| Error Rate | <1% | <0.1% | >5% |
| Throughput | 1000 RPS | 5000 RPS | <500 RPS |

### DNS (Data Plane)

| Metric | Target | Excellent | Poor |
|--------|--------|-----------|------|
| P50 Latency | <50ms | <20ms | >100ms |
| P95 Latency | <100ms | <50ms | >200ms |
| P99 Latency | <200ms | <100ms | >500ms |
| Error Rate | <0.1% | <0.01% | >1% |
| Throughput | 50K QPS | 100K QPS | <10K QPS |

## Interpreting Results

### k6 Output

```
scenarios: (100.00%) 3 scenarios, 300 max VUs, 47m30s max duration

✓ login status is 200/201
✓ login has token
✓ policies status is 200
✓ policies returns array

checks.........................: 99.95% ✓ 479800    ✗ 240
data_received..................: 1.2 GB 39 MB/s
data_sent......................: 890 MB 29 MB/s
http_req_duration..............: avg=45.23ms  p(95)=123.45ms p(99)=234.56ms
http_reqs......................: 120000 3999/s
iteration_duration.............: avg=2.1s     min=1.8s max=3.2s
vus............................: 100    min=1   max=300
```

**Key Metrics:**
- **checks**: Should be >99% (error rate <1%)
- **http_req_duration p(95)**: Should be <500ms
- **http_req_duration p(99)**: Should be <1000ms
- **http_reqs**: Throughput (RPS)

### Good Results
```
✓ http_req_duration: p(95) = 234ms  [target: <500ms]
✓ http_req_duration: p(99) = 456ms  [target: <1000ms]
✓ errors: 0.12%                     [target: <1%]
```

### Bad Results (Regression)
```
✗ http_req_duration: p(95) = 1234ms [target: <500ms]
✗ http_req_duration: p(99) = 2345ms [target: <1000ms]
✗ errors: 3.45%                     [target: <1%]
```

**Action:** Investigate bottlenecks (database, CPU, memory, network)

## CI/CD Integration

### GitHub Actions

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
          sudo cp k6-v0.47.0-linux-amd64/k6 /usr/bin

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 60

      - name: Run smoke tests
        run: ./scripts/load-testing/run-performance-tests.sh --smoke

      - name: Run regression tests
        if: github.event_name == 'pull_request'
        run: ./scripts/load-testing/run-performance-tests.sh --compare

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: load-test-results/
```

## Troubleshooting

### Error: "k6 not found"

```bash
# Install k6 (see Prerequisites section)
brew install k6  # macOS
```

### Error: "Connection refused"

```bash
# Check services are running
docker-compose ps

# Start services
docker-compose up -d

# Wait for health checks
sleep 60
```

### Error: "Authentication failed"

```bash
# Create test user
cd api
npm run seed

# Or set correct credentials
export TEST_EMAIL=your-email@example.com
export TEST_PASSWORD=your-password
```

### High Error Rates During Test

**Possible causes:**
- Database connection pool exhausted
- CPU saturation
- Memory pressure
- Network bandwidth limits

**Investigation:**
```bash
# Monitor during test
docker stats

# Check logs
docker-compose logs -f api
docker-compose logs -f policy-svc

# Profile CPU usage
curl http://localhost:4080/debug/pprof/profile?seconds=30 > cpu.prof
go tool pprof cpu.prof
```

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [Performance Baseline (O-performance-baseline.md)](../../docs/O-performance-baseline.md)
- [Capacity Planning (P-capacity-planning.md)](../../docs/P-capacity-planning.md)
- [System Design (A-system-design.md)](../../docs/A-system-design.md)

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/nebula-dns/issues
- Email: jeremy@fluxlabs.net

---

**Last Updated:** January 2026
**Version:** 1.0
