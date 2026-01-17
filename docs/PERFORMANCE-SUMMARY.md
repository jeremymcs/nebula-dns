# Performance Testing Summary

## Nebula DNS - Performance Testing Quick Reference
Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Executive Summary

This document provides a quick reference for performance testing, baselines, and capacity planning for Nebula DNS. It consolidates information from detailed documentation into actionable commands and checklists.

## Quick Commands

### Run Performance Tests

```bash
# Navigate to project root
cd /Users/jeremymcspadden/Github/nebula-dns

# Start all services
docker-compose up -d

# Wait for services to be healthy
sleep 60

# Run comprehensive tests
./scripts/load-testing/run-performance-tests.sh

# Run quick smoke test (30 seconds)
./scripts/load-testing/run-performance-tests.sh --smoke

# Establish new baseline
./scripts/load-testing/run-performance-tests.sh --baseline

# Compare against baseline (CI/CD)
./scripts/load-testing/run-performance-tests.sh --compare
```

### View Results

```bash
# Results are saved to:
cd load-test-results

# Latest API test results
cat api-test-*-summary.txt | tail -50

# Latest DNS test results
cat dns-test-*-summary.txt | tail -50

# Open HTML report (macOS)
open report-*.html
```

### Monitor During Tests

```bash
# Terminal 1: Run test
./scripts/load-testing/run-performance-tests.sh

# Terminal 2: Monitor containers
watch -n 1 'docker stats --no-stream'

# Terminal 3: View logs
docker-compose logs -f api policy-svc

# Terminal 4: Monitor PostgreSQL
docker exec -it dnsfilter-postgres psql -U nebula -c "SELECT * FROM pg_stat_activity;"

# Terminal 5: Monitor Redis
docker exec -it dnsfilter-redis redis-cli INFO stats
```

## Performance Targets (SLAs)

### API Performance (Control Plane)

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| P50 Latency | <50ms | 50-100ms | >100ms |
| P95 Latency | <200ms | 200-500ms | >500ms |
| P99 Latency | <500ms | 500-1000ms | >1000ms |
| Error Rate | <0.1% | 0.1-1% | >1% |
| Throughput | >1000 RPS | 500-1000 RPS | <500 RPS |

### DNS Performance (Data Plane)

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| P50 Latency | <20ms | 20-50ms | >50ms |
| P95 Latency | <50ms | 50-100ms | >100ms |
| P99 Latency | <100ms | 100-200ms | >200ms |
| Error Rate | <0.01% | 0.01-0.1% | >0.1% |
| Throughput | >50K QPS | 10K-50K QPS | <10K QPS |

### Database Performance

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Query P95 | <50ms | 50-100ms | >100ms |
| Connection Pool | <60% | 60-80% | >80% |
| CPU Usage | <50% | 50-70% | >70% |
| Memory Usage | <70% | 70-85% | >85% |

## Bottleneck Identification Checklist

### API Performance Issues

```bash
# Check 1: Database queries
docker-compose logs api | grep "Query took"

# Check 2: CPU usage
docker stats dnsfilter-api --no-stream

# Check 3: Memory leaks
docker stats dnsfilter-api --no-stream | awk '{print $4}'

# Check 4: Connection pool
# In api logs, look for "Connection pool exhausted"

# Check 5: Slow endpoints
# Review k6 results for high latency endpoints
```

**Common Issues:**
- N+1 queries (check for missing JOIN statements)
- Missing database indexes
- Excessive JWT verification overhead
- Connection pool too small
- Memory leaks in long-running processes

### DNS Performance Issues

```bash
# Check 1: Policy cache hit rate
docker exec dnsfilter-redis redis-cli INFO stats | grep keyspace_hits

# Check 2: Policy service CPU
docker stats dnsfilter-policy-svc --no-stream

# Check 3: Unbound query time
docker-compose logs unbound | grep "query time"

# Check 4: dnsdist queue depth
docker-compose logs dnsdist | grep "queue"

# Check 5: ClickHouse insert lag
docker exec dnsfilter-clickhouse clickhouse-client --query "SELECT count() FROM system.parts WHERE active"
```

**Common Issues:**
- Policy cache misses (check Redis memory limits)
- Unbound resolver pool saturation
- ClickHouse insert buffer overflow
- Network latency to upstream resolvers
- dnsdist rate limiting overhead

## Capacity Planning Reference

### Scaling Triggers

**Horizontal Scaling (add more instances):**
```
API Service:
  Scale up when:   CPU >70% for 5min OR P95 latency >400ms
  Scale down when: CPU <30% for 15min AND P95 latency <200ms

Policy Service:
  Scale up when:   QPS >80% capacity OR P95 latency >80ms
  Scale down when: QPS <40% capacity AND CPU <40%

DNS Resolvers:
  Scale up when:   QPS >25K OR P95 latency >100ms
  Scale down when: QPS <10K AND CPU <30%
```

**Vertical Scaling (bigger instances):**
```
PostgreSQL:
  4 vCPU, 16GB  → 10K writes/sec
  8 vCPU, 32GB  → 50K writes/sec
  16 vCPU, 64GB → 150K writes/sec

Redis:
  2 vCPU, 8GB   → 100K ops/sec
  4 vCPU, 16GB  → 250K ops/sec
  8 vCPU, 32GB  → 500K ops/sec

ClickHouse:
  4 vCPU, 16GB  → 10M inserts/day
  8 vCPU, 32GB  → 100M inserts/day
  16 vCPU, 64GB → 500M inserts/day
```

### Resource Requirements by Load

**Small (1-100 tenants, <1K QPS):**
- API: 2 instances × 2 vCPU, 4GB
- Policy: 2 instances × 2 vCPU, 4GB
- PostgreSQL: 4 vCPU, 16GB
- Redis: 2 vCPU, 8GB
- ClickHouse: 4 vCPU, 16GB, 500GB SSD
- **Cost: ~$605/month**

**Medium (100-500 tenants, 1K-10K QPS):**
- API: 4 instances × 4 vCPU, 8GB
- Policy: 6 instances × 4 vCPU, 8GB
- PostgreSQL: 8 vCPU, 32GB + 1 read replica
- Redis: 4 vCPU, 16GB (3-node cluster)
- ClickHouse: 8 vCPU, 32GB, 2TB SSD (3-node cluster)
- **Cost: ~$4,250/month**

**Large (500-2K tenants, 10K-50K QPS):**
- API: 8 instances × 8 vCPU, 16GB
- Policy: 12 instances × 8 vCPU, 16GB
- PostgreSQL: 16 vCPU, 64GB + 2 read replicas
- Redis: 8 vCPU, 32GB (6-node cluster)
- ClickHouse: 16 vCPU, 64GB, 5TB SSD (6-node cluster)
- **Cost: ~$19,950/month**

## Testing Schedule

### Daily (Automated)
```bash
# Smoke test on every commit (CI/CD)
./scripts/load-testing/run-performance-tests.sh --smoke
```

### Weekly (Automated)
```bash
# Full regression test on main branch
./scripts/load-testing/run-performance-tests.sh --compare

# If regression detected:
# 1. Review recent commits
# 2. Profile bottlenecks
# 3. Fix or revert changes
# 4. Re-run tests
```

### Monthly (Manual)
```bash
# Comprehensive stress testing
k6 run scripts/load-testing/api-load-test.js --include-scenario=stress
k6 run scripts/load-testing/dns-load-test.js

# Review results
# Update capacity planning
# Document findings
```

### Quarterly (Manual)
```bash
# Full capacity planning review
# 1. Analyze growth trends
# 2. Update resource projections
# 3. Plan infrastructure scaling
# 4. Update baseline if needed
./scripts/load-testing/run-performance-tests.sh --baseline
```

## Optimization Priority Matrix

### High Impact, Low Effort (Do First)

1. **Database Indexes**
   - Add indexes on foreign keys and frequently queried columns
   - Expected improvement: 50-80% query time reduction
   - Time to implement: 1-2 hours

2. **Redis Caching**
   - Cache frequent database queries (user sessions, policy snapshots)
   - Expected improvement: 70-90% read latency reduction
   - Time to implement: 4-8 hours

3. **Connection Pooling**
   - Optimize PostgreSQL connection pool size
   - Expected improvement: Handle 2-3x more concurrent requests
   - Time to implement: 1 hour

4. **Response Compression**
   - Enable gzip/brotli compression on API responses
   - Expected improvement: 60-80% bandwidth reduction
   - Time to implement: 30 minutes

### High Impact, Medium Effort (Do Next)

1. **Query Optimization**
   - Fix N+1 queries, add JOINs where appropriate
   - Expected improvement: 50-90% endpoint latency reduction
   - Time to implement: 1-3 days

2. **Batch Processing**
   - Batch ClickHouse inserts (1000 rows per batch)
   - Expected improvement: 10x insert throughput
   - Time to implement: 1-2 days

3. **Policy Cache Preloading**
   - Preload policy cache on service startup
   - Expected improvement: Eliminate cold-start cache misses
   - Time to implement: 1 day

4. **Read Replicas**
   - Add PostgreSQL read replicas for reporting queries
   - Expected improvement: 2-3x read throughput
   - Time to implement: 2-3 days

### High Impact, High Effort (Plan for Later)

1. **Database Sharding**
   - Shard PostgreSQL by tenant_id
   - Expected improvement: 10x write capacity
   - Time to implement: 2-4 weeks

2. **Multi-Region Deployment**
   - Deploy to 3 regions with cross-region replication
   - Expected improvement: 50-70% latency reduction for global users
   - Time to implement: 4-6 weeks

3. **Edge Computing**
   - Deploy policy evaluation at edge locations
   - Expected improvement: <10ms DNS resolution globally
   - Time to implement: 6-8 weeks

## Regression Testing in CI/CD

### GitHub Actions Workflow

Create `.github/workflows/performance.yml`:

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz
          tar xvf k6-v0.47.0-linux-amd64.tar.gz
          sudo cp k6-v0.47.0-linux-amd64/k6 /usr/bin/
          k6 version

      - name: Start services
        run: |
          docker-compose up -d
          sleep 60

      - name: Check service health
        run: |
          curl -f http://localhost:4010/health || exit 1

      - name: Run smoke tests
        run: |
          ./scripts/load-testing/run-performance-tests.sh --smoke

      - name: Run regression tests
        if: github.event_name == 'pull_request'
        run: |
          ./scripts/load-testing/run-performance-tests.sh --compare
        continue-on-error: true

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: load-test-results/
          retention-days: 30

      - name: Comment on PR
        if: github.event_name == 'pull_request' && failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Performance regression detected. Review load test results in artifacts.'
            })
```

### Pass/Fail Criteria

**Auto-fail PR if:**
- P95 latency increased >10%
- Error rate increased >0.5%
- Throughput decreased >10%

**Warning (manual review) if:**
- P95 latency increased 5-10%
- Error rate increased 0.1-0.5%
- Memory usage increased >20%

## Performance Troubleshooting Guide

### Issue: High API Latency

**Symptoms:**
- P95 latency >500ms
- Users report slow dashboard loading

**Diagnosis:**
```bash
# 1. Check database query times
docker-compose logs api | grep "Query took" | sort -n

# 2. Profile API
# Add to api/src/main.ts:
# app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

# 3. Check for N+1 queries
# Review API logs during test

# 4. Monitor connection pool
docker exec dnsfilter-postgres psql -U nebula -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions:**
1. Add database indexes
2. Fix N+1 queries with JOINs
3. Increase connection pool size
4. Add Redis caching for frequent queries
5. Enable response compression

### Issue: High DNS Latency

**Symptoms:**
- P95 latency >100ms
- DNS queries timing out

**Diagnosis:**
```bash
# 1. Check policy cache hit rate
docker exec dnsfilter-redis redis-cli INFO stats

# 2. Check policy service CPU
docker stats dnsfilter-policy-svc --no-stream

# 3. Check Unbound query times
docker-compose logs unbound | grep "query"

# 4. Profile policy service
curl http://localhost:4080/debug/pprof/profile?seconds=30 > cpu.prof
go tool pprof cpu.prof
```

**Solutions:**
1. Increase Redis memory for policy cache
2. Scale policy service horizontally
3. Add more Unbound resolvers
4. Optimize policy evaluation algorithm
5. Check upstream resolver latency

### Issue: Database Connection Pool Exhausted

**Symptoms:**
- API errors: "Connection pool exhausted"
- High connection count in PostgreSQL

**Diagnosis:**
```bash
# Check current connections
docker exec dnsfilter-postgres psql -U nebula -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Check long-running queries
docker exec dnsfilter-postgres psql -U nebula -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;"
```

**Solutions:**
1. Increase connection pool max size in API config
2. Reduce connection timeout
3. Fix long-running queries
4. Add read replicas for read-heavy workloads
5. Implement connection pooling with PgBouncer

## Documentation Links

**Detailed Documentation:**
- [O-performance-baseline.md](./O-performance-baseline.md) - Complete baseline metrics and targets
- [P-capacity-planning.md](./P-capacity-planning.md) - Scaling strategies and cost analysis
- [scripts/load-testing/README.md](../scripts/load-testing/README.md) - Load testing tools and usage

**Architecture Documentation:**
- [A-system-design.md](./A-system-design.md) - System architecture overview
- [E-policy-evaluation-algorithm.md](./E-policy-evaluation-algorithm.md) - O(1) algorithm details

**Related Documentation:**
- [B-threat-model.md](./B-threat-model.md) - Security considerations
- [C-database-schema.md](./C-database-schema.md) - Database design
- [H-test-plan.md](./H-test-plan.md) - Comprehensive testing strategy

## Support and Escalation

**For performance issues:**
1. Check this quick reference guide
2. Review detailed baseline documentation
3. Run diagnostic commands above
4. Open GitHub issue with test results
5. Email: jeremy@fluxlabs.net

**Include in bug reports:**
- k6 test results (JSON + summary)
- Docker stats output
- Service logs (API, policy-svc, databases)
- System resource usage (CPU, memory, disk)
- Recent changes or deployments

---

**Document Version:** 1.0
**Last Updated:** January 2026
**Next Review:** After first baseline test run
