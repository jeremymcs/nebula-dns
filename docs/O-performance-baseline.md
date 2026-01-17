# O. Performance Baseline

## Nebula DNS - Performance Baseline Documentation
Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Executive Summary

This document establishes performance baselines for Nebula DNS based on system design targets and load testing results. These baselines serve as benchmarks for regression testing, capacity planning, and performance monitoring.

## Test Environment

### Hardware Configuration
- **CPU**: 8 cores @ 2.4GHz (recommended: 16 cores for production)
- **Memory**: 32GB RAM (recommended: 64GB for production)
- **Storage**: SSD with 500MB/s sustained writes
- **Network**: 10Gbps network interface

### Docker Compose Stack
- **API Service**: NestJS on Node.js 20
- **Policy Service**: Go 1.21+ compiled binary
- **Report Service**: Go 1.21+ compiled binary
- **PostgreSQL**: 16-alpine (4GB shared_buffers)
- **Redis**: 7-alpine (4GB maxmemory)
- **ClickHouse**: 24.1 (8GB max_memory_usage)
- **dnsdist**: Latest stable
- **Unbound**: Latest stable

### Test Date
Initial baseline established: January 2026

## Performance Targets vs. Baselines

### API Performance (Control Plane)

| Metric | Target | Baseline | Status | Notes |
|--------|--------|----------|--------|-------|
| P50 Latency | <100ms | TBD | Pending | Authentication, policy CRUD |
| P95 Latency | <500ms | TBD | Pending | Complex queries with joins |
| P99 Latency | <1000ms | TBD | Pending | Report generation |
| Error Rate | <1% | TBD | Pending | Under sustained load |
| Max RPS | 1000 | TBD | Pending | Sustained throughput |
| CPU Utilization | <70% | TBD | Pending | At 1000 RPS |
| Memory Usage | <2GB | TBD | Pending | API service container |

**Test Scenarios:**
1. Authentication (POST /auth/login)
2. Policy Listing (GET /policies)
3. Location Listing (GET /locations)
4. Report Summary (GET /reports/summary)
5. Policy Creation (POST /policies)
6. List Management (POST /lists/entries)

### DNS Performance (Data Plane)

| Metric | Target | Baseline | Status | Notes |
|--------|--------|----------|--------|-------|
| P50 Latency | <50ms | TBD | Pending | Policy evaluation + resolution |
| P95 Latency | <100ms | TBD | Pending | Cache miss scenarios |
| P99 Latency | <200ms | TBD | Pending | Upstream resolver timeout |
| Error Rate | <0.1% | TBD | Pending | SERVFAIL responses |
| Max QPS | 50,000 | TBD | Pending | Per data plane instance |
| Policy Eval Time | <1ms | TBD | Pending | O(1) algorithm target |
| CPU Utilization | <80% | TBD | Pending | At 50K QPS |
| Memory Usage | <4GB | TBD | Pending | Policy cache + buffers |

**Test Scenarios:**
1. Allowed domain resolution (cache hit)
2. Blocked domain (exact match)
3. Blocked domain (wildcard match)
4. Category filtering
5. Threat intelligence blocking
6. SafeSearch rewrites

### Database Performance

#### PostgreSQL (Control Plane)

| Metric | Target | Baseline | Status | Notes |
|--------|--------|----------|--------|-------|
| Query P95 | <50ms | TBD | Pending | Simple SELECT with indexes |
| Complex Query P95 | <200ms | TBD | Pending | Multi-table joins |
| Write P95 | <100ms | TBD | Pending | INSERT/UPDATE operations |
| Connection Pool | <80% | TBD | Pending | At peak load |
| Lock Contention | <5% | TBD | Pending | Concurrent updates |

**Critical Queries:**
- Policy snapshot compilation
- User authentication lookup
- Location credential validation
- Audit log writes

#### Redis (Cache Layer)

| Metric | Target | Baseline | Status | Notes |
|--------|--------|----------|--------|-------|
| GET Latency P95 | <1ms | TBD | Pending | Policy cache hits |
| SET Latency P95 | <2ms | TBD | Pending | Cache invalidation |
| Pub/Sub Latency | <5ms | TBD | Pending | Policy update propagation |
| Memory Usage | <8GB | TBD | Pending | Policy snapshots + rate limits |
| Eviction Rate | 0 | TBD | Pending | No evictions expected |

**Key Operations:**
- Policy snapshot retrieval
- Rate limit bucket updates
- Policy update pub/sub
- Session cache

#### ClickHouse (Analytics)

| Metric | Target | Baseline | Status | Notes |
|--------|--------|----------|--------|-------|
| Insert P95 | <10ms | TBD | Pending | Batch inserts (1000 rows) |
| Query P95 | <500ms | TBD | Pending | Time-series aggregations |
| Storage Growth | <50GB/day | TBD | Pending | 10M queries/day estimate |
| Compression Ratio | >10:1 | TBD | Pending | LZ4 compression |
| Merge Performance | <30s | TBD | Pending | Background merges |

**Critical Queries:**
- Top blocked domains (last 24h)
- Query volume by category
- Security threats detected
- User activity reports

## Load Test Results

### API Load Test (k6)

**Test Configuration:**
```bash
# Smoke Test: 30s @ 1 VU
# Load Test: 16m ramping to 100 VUs
# Stress Test: 22m ramping to 300 VUs
k6 run scripts/load-testing/api-load-test.js
```

**Expected Results (to be populated after testing):**

```
Scenarios Summary:
  smoke    - 30 iterations   (100% pass)
  load     - 48k iterations  (99.9% pass)
  stress   - 120k iterations (98% pass at 300 VUs)

Metrics:
  http_req_duration:
    p(50): __ms  [target: <100ms]
    p(95): __ms  [target: <500ms]
    p(99): __ms  [target: <1000ms]

  login_duration:
    p(95): __ms  [target: <1000ms]

  policies_duration:
    p(95): __ms  [target: <200ms]

  locations_duration:
    p(95): __ms  [target: <200ms]

  errors: __%  [target: <1%]
```

**Bottlenecks Identified:**
- [ ] Database connection pool exhaustion at >200 VUs
- [ ] JWT verification CPU overhead at >500 RPS
- [ ] Redis connection limits at >1000 concurrent connections
- [ ] Memory pressure during report generation

### DNS Load Test (k6)

**Test Configuration:**
```bash
# Sustained: 5m @ 1000 QPS
# Spike: 4m with 30s spike to 5000 QPS
k6 run scripts/load-testing/dns-load-test.js
```

**Expected Results (to be populated after testing):**

```
Scenarios Summary:
  sustained - 300k queries  (99.95% success)
  spike     - 840k queries  (99.9% success)

Metrics:
  dns_query_duration:
    p(50): __ms  [target: <50ms]
    p(95): __ms  [target: <100ms]
    p(99): __ms  [target: <200ms]

  dns_errors: __%  [target: <0.1%]

  Total QPS: ____ queries/sec

  blocked_queries: __k
  allowed_queries: __k
```

**Bottlenecks Identified:**
- [ ] Policy cache miss rate >1% causes latency spikes
- [ ] Unbound resolver pool saturation at >30K QPS
- [ ] ClickHouse insert buffer overflow at >50K QPS
- [ ] dnsdist rate limiting overhead at >100K QPS

## Component-Level Benchmarks

### Policy Service (Go)

**Evaluation Performance:**
```bash
cd policy-svc
go test -bench=BenchmarkEvaluate -benchmem
```

**Expected Results:**
```
BenchmarkEvaluate/exact_match_allow-8     ____ ns/op  __ B/op  __ allocs/op
BenchmarkEvaluate/exact_match_block-8     ____ ns/op  __ B/op  __ allocs/op
BenchmarkEvaluate/wildcard_match-8        ____ ns/op  __ B/op  __ allocs/op
BenchmarkEvaluate/category_filter-8       ____ ns/op  __ B/op  __ allocs/op
BenchmarkEvaluate/cache_miss-8            ____ ns/op  __ B/op  __ allocs/op
```

**Targets:**
- Exact match: <100 nanoseconds
- Wildcard match: <500 nanoseconds
- Category filter: <1000 nanoseconds
- Zero allocations per evaluation (pre-allocated pools)

### Report Service (Go)

**Query Performance:**
```bash
cd report-svc
go test -bench=BenchmarkReportGeneration -benchmem
```

**Expected Results:**
```
BenchmarkReport/top_domains-8        ____ ms/op  __ MB/op  __ allocs/op
BenchmarkReport/time_series-8        ____ ms/op  __ MB/op  __ allocs/op
BenchmarkReport/category_breakdown-8 ____ ms/op  __ MB/op  __ allocs/op
```

**Targets:**
- Top domains (24h): <500ms
- Time series (7d): <1000ms
- Category breakdown (30d): <2000ms

## Capacity Planning Guidelines

### Scaling Thresholds

**API Service (horizontal scaling):**
- Scale up at: 600 RPS sustained, P95 latency >400ms
- Scale down at: <200 RPS sustained, CPU <30%
- Min instances: 2 (HA)
- Max instances: 10 (cost limit)

**Policy Service (horizontal scaling):**
- Scale up at: 30K QPS sustained, P95 latency >80ms
- Scale down at: <10K QPS sustained, CPU <40%
- Min instances: 3 (HA + geographic distribution)
- Max instances: 20 per region

**Database (vertical scaling first, then read replicas):**
- PostgreSQL: 8GB RAM per 10K tenants
- Redis: 16GB RAM per 1M cached policies
- ClickHouse: 100GB disk per 100M queries/day

### Resource Allocation Per Tier

**Small Deployment (1-10 tenants, <1K QPS):**
```yaml
api: 2 vCPU, 4GB RAM
policy-svc: 2 vCPU, 4GB RAM
postgres: 2 vCPU, 8GB RAM
redis: 1 vCPU, 2GB RAM
clickhouse: 2 vCPU, 8GB RAM, 100GB SSD
```

**Medium Deployment (10-100 tenants, <10K QPS):**
```yaml
api: 4 vCPU, 8GB RAM (x2 instances)
policy-svc: 4 vCPU, 8GB RAM (x3 instances)
postgres: 4 vCPU, 16GB RAM
redis: 2 vCPU, 8GB RAM
clickhouse: 8 vCPU, 32GB RAM, 500GB SSD
```

**Large Deployment (100-1000 tenants, <50K QPS):**
```yaml
api: 8 vCPU, 16GB RAM (x4 instances)
policy-svc: 8 vCPU, 16GB RAM (x6 instances)
postgres: 16 vCPU, 64GB RAM (primary + 2 read replicas)
redis: 4 vCPU, 16GB RAM (cluster mode)
clickhouse: 16 vCPU, 64GB RAM, 2TB SSD (cluster)
```

## Performance Optimization Checklist

### Completed Optimizations
- [ ] Policy evaluation O(1) algorithm implemented
- [ ] Redis caching with pub/sub invalidation
- [ ] ClickHouse materialized views for aggregations
- [ ] Database indexes on foreign keys and query columns
- [ ] Connection pooling configured (PostgreSQL, Redis)
- [ ] API response compression (gzip)
- [ ] JWT token caching in Redis
- [ ] Batch inserts for ClickHouse (1000 rows)

### Pending Optimizations
- [ ] Policy cache preloading on service startup
- [ ] Bloom filter for negative cache lookups
- [ ] HTTP/2 for API communication
- [ ] Database query result caching (5-minute TTL)
- [ ] CDN for static assets (UI)
- [ ] Geographic load balancing (multi-region)
- [ ] Read replicas for reporting queries
- [ ] Async processing for non-critical operations

## Monitoring and Alerting

### Performance SLIs (Service Level Indicators)

**API Availability:**
- Target: 99.9% uptime (43 minutes downtime/month)
- Measurement: Synthetic checks every 60s

**API Latency:**
- Target: P95 <500ms, P99 <1000ms
- Measurement: APM tracing (all requests)

**DNS Resolution:**
- Target: P95 <100ms, P99 <200ms
- Measurement: dnsdist metrics + ClickHouse logs

**Error Rates:**
- API: <1% error rate
- DNS: <0.1% SERVFAIL rate
- Measurement: Application logs + metrics

### Alert Thresholds

**Critical Alerts (PagerDuty):**
- API P95 latency >1000ms for 5 minutes
- DNS P95 latency >300ms for 5 minutes
- Error rate >5% for 2 minutes
- Service down (health check failure)
- Database connection pool >90% for 5 minutes

**Warning Alerts (Slack):**
- API P95 latency >500ms for 10 minutes
- DNS P95 latency >150ms for 10 minutes
- Error rate >1% for 5 minutes
- CPU >80% for 15 minutes
- Memory >85% for 15 minutes
- Disk >80% full

### Dashboards

**Real-time Performance Dashboard (Grafana):**
- Request rate (RPS, QPS)
- Latency percentiles (P50, P95, P99)
- Error rates by service
- CPU, memory, disk utilization
- Database connections and query performance
- Cache hit rates

**Business Metrics Dashboard:**
- Active tenants
- Queries processed (24h, 7d, 30d)
- Top blocked categories
- Threat detections
- User engagement

## Regression Testing

### Automated Performance Tests

**CI/CD Integration:**
- Run smoke tests on every PR (30s duration)
- Run load tests on main branch merges (5m duration)
- Run full stress tests weekly (30m duration)
- Compare results against baseline (±10% tolerance)

**Regression Detection:**
```bash
# Run baseline test and save results
k6 run scripts/load-testing/api-load-test.js \
  --out json=baseline-api.json

# Run current test and compare
k6 run scripts/load-testing/api-load-test.js \
  --out json=current-api.json

# Automated comparison (10% degradation threshold)
./scripts/load-testing/compare-results.sh \
  baseline-api.json current-api.json
```

**Fail Criteria:**
- P95 latency increased by >10%
- Error rate increased by >0.5%
- Throughput decreased by >10%
- Memory usage increased by >20%

## Benchmarking Protocol

### Pre-test Checklist
1. Ensure all services are healthy (health checks passing)
2. Clear caches (Redis FLUSHDB) for cold-start tests
3. Warm up caches with 1-minute low-load test
4. Monitor system resources (htop, docker stats)
5. Disable non-essential background jobs
6. Document system configuration (versions, resource limits)

### Test Execution
1. Run smoke test to verify functionality
2. Run load test at target capacity
3. Run stress test to find breaking point
4. Monitor for memory leaks (24h soak test)
5. Document results and observed behavior

### Post-test Analysis
1. Extract metrics from k6 results
2. Analyze ClickHouse query logs
3. Review application logs for errors
4. Profile CPU usage (pprof for Go services)
5. Analyze memory allocation patterns
6. Identify top bottlenecks (top 3)
7. Document findings and recommendations

## Historical Performance Trends

### Version Performance Comparison

| Version | API P95 | DNS P95 | Max QPS | Notes |
|---------|---------|---------|---------|-------|
| v1.0.0  | TBD     | TBD     | TBD     | Initial baseline |
| v1.1.0  | TBD     | TBD     | TBD     | Redis optimization |
| v1.2.0  | TBD     | TBD     | TBD     | Batch insert improvements |

## Appendix A: Test Commands

### API Load Test
```bash
# Set environment variables
export API_URL=http://localhost:4010
export TEST_EMAIL=admin@example.com
export TEST_PASSWORD=password123

# Run full test suite
k6 run scripts/load-testing/api-load-test.js

# Run specific scenario only
k6 run --include-scenario=load scripts/load-testing/api-load-test.js

# Output to JSON for analysis
k6 run scripts/load-testing/api-load-test.js --out json=results.json
```

### DNS Load Test
```bash
# Set environment variables
export DOH_URL=https://localhost:4443/dns-query
export DNS_TOKEN=your-auth-token

# Run full test suite
k6 run scripts/load-testing/dns-load-test.js

# Custom QPS target
k6 run scripts/load-testing/dns-load-test.js \
  -e RATE=5000 -e DURATION=10m
```

### Benchmark Go Services
```bash
# Policy service
cd policy-svc
go test -bench=. -benchmem -cpuprofile=cpu.prof -memprofile=mem.prof

# Analyze CPU profile
go tool pprof cpu.prof

# Analyze memory profile
go tool pprof -alloc_space mem.prof
```

## Appendix B: Performance Tuning Guide

### PostgreSQL Tuning
```sql
-- Increase shared buffers (25% of RAM)
shared_buffers = 8GB

-- Effective cache size (50% of RAM)
effective_cache_size = 16GB

-- Maintenance work mem (1GB)
maintenance_work_mem = 1GB

-- Max connections
max_connections = 200

-- Work mem per query
work_mem = 64MB
```

### Redis Tuning
```conf
# Max memory (leave 25% for OS)
maxmemory 12gb

# Eviction policy (don't evict)
maxmemory-policy noeviction

# Persistence (AOF for durability)
appendonly yes
appendfsync everysec

# Max clients
maxclients 10000
```

### ClickHouse Tuning
```xml
<clickhouse>
  <max_memory_usage>16000000000</max_memory_usage>
  <max_concurrent_queries>100</max_concurrent_queries>
  <max_threads>8</max_threads>
  <background_pool_size>16</background_pool_size>
  <compression>
    <case>
      <method>lz4</method>
    </case>
  </compression>
</clickhouse>
```

## Next Steps

1. Run initial baseline tests on production-like environment
2. Populate "TBD" values in all tables above
3. Identify top 3 bottlenecks for each service
4. Implement pending optimizations (prioritize by impact)
5. Establish weekly performance regression testing
6. Set up real-time monitoring dashboards
7. Create quarterly performance review process

---

**Document Version**: 1.0
**Last Updated**: January 2026
**Next Review**: Quarterly or after major releases
