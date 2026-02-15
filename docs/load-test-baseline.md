# Nebula DNS - Load Test Performance Baseline

// Nebula DNS - Load Test Performance Baseline
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Date Established:** 2026-02-15
**Environment:** DOKS Staging Cluster
**Last Updated:** 2026-02-15

## Purpose

This document establishes the "known good" performance baseline for Nebula DNS based on k6 load test results against the staging environment. The baseline serves as a reference for regression detection and validates SLO compliance before production releases.

**Key uses:**
- Detect performance regressions during development
- Validate infrastructure changes don't degrade performance
- Ensure SLO compliance before production deployments
- Track performance trends over time

## Test Environment

**DOKS Staging Cluster Specifications:**

| Component | Configuration | Notes |
|-----------|--------------|-------|
| **Kubernetes** | DigitalOcean Kubernetes (DOKS) | HA control plane enabled (99.95% SLA) |
| **Node Pool** | s-4vcpu-8gb instances | 4 vCPU, 8GB RAM per node |
| **Auto-scaling** | 3-10 nodes | Min 3 for HA, max 10 for capacity |
| **PostgreSQL** | Managed 2-node HA with PgBouncer | 50-connection pool, transaction mode |
| **Valkey (Redis)** | Managed 2-node HA with TLS | Redis-compatible, cache + pub/sub |
| **ClickHouse** | ClickHouse Cloud Development Tier | 24-48GB auto-scaling, 5-min idle timeout |
| **Network** | VPC 10.10.0.0/16 | Private networking, DO load balancers |

**Load Test Configuration:**
- Tool: k6 v0.54.0
- Scripts: `scripts/load-testing/api-load-test.js`, `scripts/load-testing/dns-load-test.js`
- Environment: k6-staging.env
- Scenarios: smoke (30s), load (16m), stress (39m)

## API Performance Baseline

### Overall Metrics

| Metric | Baseline Value | SLO Target | Status |
|--------|---------------|------------|--------|
| **p50 Latency** | TBD - run k6 against staging to populate | <100ms | TBD |
| **p95 Latency** | TBD - run k6 against staging to populate | <200ms | TBD |
| **p99 Latency** | TBD - run k6 against staging to populate | <500ms | TBD |
| **Error Rate** | TBD - run k6 against staging to populate | <0.1% (99.9% availability) | TBD |
| **Max QPS Sustained** | TBD - run k6 against staging to populate | N/A | TBD |

### Endpoint-Specific Metrics

#### Authentication Endpoints

| Endpoint | p50 | p95 | p99 | Error Rate | Notes |
|----------|-----|-----|-----|------------|-------|
| POST /api/v1/auth/login | TBD | TBD | TBD | TBD | JWT generation overhead |
| POST /api/v1/auth/refresh | TBD | TBD | TBD | TBD | Token validation + rotation |
| POST /api/v1/auth/logout | TBD | TBD | TBD | TBD | Session cleanup |

#### Policy Management Endpoints

| Endpoint | p50 | p95 | p99 | Error Rate | Notes |
|----------|-----|-----|-----|------------|-------|
| GET /api/v1/policies | TBD | TBD | TBD | TBD | List with pagination |
| GET /api/v1/policies/:id | TBD | TBD | TBD | TBD | Single policy fetch |
| POST /api/v1/policies | TBD | TBD | TBD | TBD | Create + Redis pub/sub |
| PUT /api/v1/policies/:id | TBD | TBD | TBD | TBD | Update + cache invalidation |
| DELETE /api/v1/policies/:id | TBD | TBD | TBD | TBD | Delete + cache invalidation |

#### Location Management Endpoints

| Endpoint | p50 | p95 | p99 | Error Rate | Notes |
|----------|-----|-----|-----|------------|-------|
| GET /api/v1/locations | TBD | TBD | TBD | TBD | List with join queries |
| GET /api/v1/locations/:id | TBD | TBD | TBD | TBD | Single location fetch |
| POST /api/v1/locations | TBD | TBD | TBD | TBD | Create with validation |

#### Dashboard Stats Endpoints

| Endpoint | p50 | p95 | p99 | Error Rate | Notes |
|----------|-----|-----|-----|------------|-------|
| GET /api/v1/reports/query-stats | TBD | TBD | TBD | TBD | ClickHouse aggregation |
| GET /api/v1/reports/threat-stats | TBD | TBD | TBD | TBD | ClickHouse time-series |
| GET /api/v1/reports/overview | TBD | TBD | TBD | TBD | Multi-source aggregation |

## DNS Performance Baseline

### DoH (DNS over HTTPS) Metrics

| Metric | Baseline Value | SLO Target | Status |
|--------|---------------|------------|--------|
| **p50 Latency** | TBD - run k6 against staging to populate | <50ms | TBD |
| **p95 Latency** | TBD - run k6 against staging to populate | <100ms | TBD |
| **p99 Latency** | TBD - run k6 against staging to populate | <200ms | TBD |
| **Error Rate** | TBD - run k6 against staging to populate | <0.1% (99.9% availability) | TBD |
| **Sustained QPS** | TBD - run k6 against staging to populate | 1000+ QPS | TBD |

### Query Type Performance Comparison

| Query Type | p50 | p95 | p99 | Notes |
|------------|-----|-----|-----|-------|
| **Allowed Queries** | TBD | TBD | TBD | Cache miss: full resolution path |
| **Blocked Queries** | TBD | TBD | TBD | Cache hit: policy eval + block page |
| **Cached Allowed** | TBD | TBD | TBD | Best case: Unbound cache hit |
| **Cached Blocked** | TBD | TBD | TBD | Best case: Redis policy cache hit |

### Load Pattern Performance

| Scenario | QPS | Duration | p95 Latency | Error Rate | Notes |
|----------|-----|----------|-------------|------------|-------|
| **Smoke Test** | 10 | 30s | TBD | TBD | Quick validation |
| **Sustained Load** | 1000 | 5m | TBD | TBD | Production-like traffic |
| **Spike Test** | 5000 peak | 2m | TBD | TBD | Traffic burst handling |

## Baseline Update Process

### Schedule

**Weekly Automated Runs (Monitoring):**
- Trigger: GitHub Actions cron schedule
- Schedule: Every Monday at 2:00 AM UTC
- Duration: ~16 minutes (load scenario)
- Purpose: Continuous regression detection

**Pre-Release Runs (Validation):**
- Trigger: Manual workflow dispatch
- Scenarios: Load + Stress (55 minutes total)
- Purpose: Validate production readiness

### Update Criteria

**Baseline should be updated when:**

1. **Quarterly Review** - Every 3 months on the 1st
2. **Infrastructure Changes:**
   - Node pool size or instance type changes
   - Database tier upgrades (PostgreSQL, Valkey, ClickHouse)
   - Network configuration changes (load balancers, VPC)
3. **Significant Performance Improvements:**
   - Code optimizations that improve p95 latency by >20%
   - New caching strategies
   - Database query optimizations
4. **SLO Target Adjustments:**
   - When business requirements change SLO targets

### Regression Detection

**Threshold for Investigation:**
- **>20% degradation** from baseline triggers investigation
- **>10% degradation** for 3 consecutive weeks triggers review
- **Error rate increase** of >0.05% (e.g., 0.03% → 0.08%) triggers immediate review

**Investigation Process:**
1. Review recent deployments and infrastructure changes
2. Check resource utilization (CPU, memory, connection pools)
3. Compare k6 results with production metrics (Prometheus/Grafana)
4. Analyze slow query logs (PostgreSQL) and cache hit rates (Redis)
5. Document findings in incident report or GitHub issue

### Comparison Process

```bash
# Generate baseline report from k6 JSON output
./scripts/load-testing/baseline-report.sh results/api-load-*.json results/dns-load-*.json > baseline-$(date +%Y-%m-%d).md

# Compare current results to previous baseline
./scripts/load-testing/compare-results.sh \
  baseline-2026-02-15.md \
  baseline-2026-02-22.md \
  --threshold 20 \
  --output comparison-report.md
```

The comparison script will flag:
- Latency regressions (p50, p95, p99)
- Error rate increases
- QPS capacity reductions
- Endpoint-specific degradations

## How to Run Load Tests

### Prerequisites

```bash
# Install k6
curl -L https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-linux-amd64.tar.gz | tar xvz
sudo mv k6 /usr/local/bin/

# Verify installation
k6 version
```

### Running Tests Locally

**Smoke Test (30 seconds - quick validation):**
```bash
cd scripts/load-testing
export K6_SCENARIO=smoke
source k6-staging.env

# API smoke test
k6 run api-load-test.js

# DNS smoke test
k6 run dns-load-test.js
```

**Load Test (16 minutes - production-like traffic):**
```bash
export K6_SCENARIO=load
source k6-staging.env

# API load test
k6 run api-load-test.js --out json=results/api-load-$(date +%Y%m%d-%H%M%S).json

# DNS load test
k6 run dns-load-test.js --out json=results/dns-load-$(date +%Y%m%d-%H%M%S).json
```

**Stress Test (39 minutes - capacity limits):**
```bash
export K6_SCENARIO=stress
source k6-staging.env

# API stress test
k6 run api-load-test.js --out json=results/api-stress-$(date +%Y%m%d-%H%M%S).json

# DNS stress test (spike scenario)
export K6_SCENARIO=spike
k6 run dns-load-test.js --out json=results/dns-spike-$(date +%Y%m%d-%H%M%S).json
```

### Running Tests via CI/CD

**Automatic Runs:**
- Scheduled: Every Monday at 2:00 AM UTC (load scenario)
- On Push: When `scripts/load-testing/**` files change (smoke scenario only)

**Manual Runs:**
1. Navigate to GitHub Actions → "Load Testing" workflow
2. Click "Run workflow"
3. Select branch (usually `main`)
4. Choose scenario: `smoke`, `load`, or `stress`
5. Click "Run workflow"

**View Results:**
- GitHub Actions UI: Check "Step Summary" for metrics table
- Artifacts: Download JSON results for detailed analysis
- Grafana: View SLO dashboard for historical trends (if k6 → Prometheus integration enabled)

### Generating Baseline Report

```bash
# After running load tests with JSON output
./scripts/load-testing/baseline-report.sh \
  results/api-load-*.json \
  results/dns-load-*.json \
  > baseline-$(date +%Y-%m-%d).md

# Review the generated report
cat baseline-$(date +%Y-%m-%d).md

# Update this document with new baseline values
# Copy tables from generated report into "API Performance Baseline" and "DNS Performance Baseline" sections
```

### Comparing Results

```bash
# Compare this week's results to last week's baseline
./scripts/load-testing/compare-results.sh \
  baseline-2026-02-08.md \
  baseline-2026-02-15.md \
  --threshold 20 \
  --output comparison-2026-02-15.md

# Review comparison report for regressions
cat comparison-2026-02-15.md

# If regressions found (>20% degradation):
# 1. Create GitHub issue with comparison report
# 2. Investigate recent changes (git log, deployments)
# 3. Review Grafana dashboards for resource usage
# 4. Check connection pool metrics and database slow queries
```

## Notes

**Initial Baseline Status:**
- Baseline values marked "TBD" until first staging load test execution
- Staging cluster provisioned in Phase 24, ready for load testing
- k6 scripts updated with SLO-aligned thresholds in Phase 31 Plan 01
- Next step: Run full load scenario against staging to populate baseline values

**Production vs Staging:**
- Staging cluster uses same instance types as production (s-4vcpu-8gb)
- Staging databases use same HA configuration as production
- Staging traffic is synthetic (k6), production traffic is real users
- Baseline represents **staging performance** as proxy for production capacity

**SLO Compliance:**
- All baselines include SLO target column for easy comparison
- Green: Meets SLO target
- Yellow: Within 10% of SLO target (warning)
- Red: Exceeds SLO target (requires optimization before production)

---

*Last Updated: 2026-02-15*
*Next Review: 2026-03-15 (quarterly)*
*Contact: DevOps team for baseline update requests*
