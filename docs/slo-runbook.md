# Nebula DNS - SLO Definitions & Operations Runbook

// Nebula DNS - SLO Definitions & Operations Runbook
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Version:** 1.0
**Last Updated:** 2026-02-15
**Owner:** DevOps/SRE Team
**On-Call Escalation:** See "Alert Response Procedures" section

## Purpose

This runbook documents all Service Level Objectives (SLOs), error budget policies, and operational procedures for responding to SLO violations in Nebula DNS. It serves as the primary reference for on-call engineers when handling SLO alerts.

**Key uses:**
- Understand SLO targets and error budget calculations
- Respond to burn rate alerts with appropriate urgency
- Make error budget policy decisions (feature freeze, rollback, etc.)
- Escalate incidents when necessary

## SLO Definitions

### Service Level Objectives Summary

| SLO Name | Target | Measurement Window | Error Budget | Burn Rate Alerts |
|----------|--------|-------------------|--------------|------------------|
| **DNS Availability** | 99.9% | 30d rolling | 43.8 min/month | Fast: 14.4x, Slow: 6x |
| **API Availability** | 99.9% | 30d rolling | 43.8 min/month | Fast: 14.4x, Slow: 6x |
| **API Latency** | p95 < 200ms | 5m window | N/A (threshold-based) | Fast: 1h+5m, Slow: 6h+30m |
| **Policy Eval Latency** | p95 < 50ms | 5m window | N/A (threshold-based) | Fast: 1h+5m, Slow: 6h+30m |

### DNS Availability SLO

**Target:** 99.9% of DNS queries return successful responses (NOERROR, NXDOMAIN)

**Measurement:**
- Metric: `probe_success{job="blackbox-dns"}` from Blackbox Exporter
- Query: `sum(rate(probe_success{job="blackbox-dns"}[30d])) / count(probe_success{job="blackbox-dns"})`
- Window: 30-day rolling window
- Failure conditions: Probe timeouts, SERVFAIL responses, connection errors

**Error Budget:**
- 0.1% of queries can fail = 43.8 minutes of downtime per month
- Calculation: 30 days × 24 hours × 60 minutes × 0.001 = 43.2 minutes (rounded to 43.8 for consistency)

**What counts as a failure:**
- DNS query timeout (>5s)
- SERVFAIL response from resolver
- Connection refused (dnsdist or Unbound down)
- TLS handshake failure (DoT/DoH)

**What does NOT count as a failure:**
- NXDOMAIN for blocked domains (expected behavior)
- NXDOMAIN for non-existent domains (user error)
- Client-side errors (malformed queries)

### API Availability SLO

**Target:** 99.9% of API requests return non-5xx status codes

**Measurement:**
- Metric: `http_requests_total{job="api",status=~"5.."}` / `http_requests_total{job="api"}`
- Query: `1 - (sum(rate(http_requests_total{job="api",status=~"5.."}[30d])) / sum(rate(http_requests_total{job="api"}[30d])))`
- Window: 30-day rolling window
- Failure conditions: 500, 502, 503, 504 status codes

**Error Budget:**
- 0.1% of requests can fail = 43.8 minutes of errors per month
- For 100 req/s average: 43.8 min × 100 req/s = ~262,800 failed requests allowed per month

**What counts as a failure:**
- 500 Internal Server Error (unhandled exceptions)
- 502 Bad Gateway (upstream service down)
- 503 Service Unavailable (overload, deployment)
- 504 Gateway Timeout (request timeout)

**What does NOT count as a failure:**
- 4xx client errors (400, 401, 403, 404, 422)
- Requests to health check endpoints (`/health`, `/api/health`)
- Requests from load testing (filtered by env label)

### API Latency SLO

**Target:** 95th percentile (p95) API response time < 200ms

**Measurement:**
- Metric: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="api"}[5m])) by (le))`
- Window: 5-minute rolling window
- Excludes: Health check endpoints, static file requests

**Error Budget:**
- N/A (threshold-based SLO, not availability-based)
- Alerts trigger on sustained violations (multi-window burn rate pattern)

**What counts as a violation:**
- p95 latency > 200ms for both 1h and 5m windows (fast burn)
- p95 latency > 200ms for both 6h and 30m windows (slow burn)

**Expected latency by endpoint type:**
- Authentication: 50-100ms (JWT generation overhead)
- Read-only (GET): 20-80ms (database queries)
- Writes (POST/PUT): 50-150ms (database + Redis pub/sub)
- Reports/Analytics: 100-200ms (ClickHouse aggregations)

### Policy Evaluation Latency SLO

**Target:** 95th percentile (p95) policy evaluation time < 50ms

**Measurement:**
- Metric: `histogram_quantile(0.95, sum(rate(policy_evaluation_duration_seconds_bucket{job="policy-svc"}[5m])) by (le))`
- Window: 5-minute rolling window
- Critical for DNS query path (contributes to total DNS latency)

**Error Budget:**
- N/A (threshold-based SLO)
- Alerts trigger on sustained violations (multi-window burn rate pattern)

**What counts as a violation:**
- p95 eval time > 50ms for both 1h and 5m windows (fast burn)
- p95 eval time > 50ms for both 6h and 30m windows (slow burn)

**Expected latency:**
- Cache hit (Redis): 1-10ms
- Cache miss (evaluate + update): 20-40ms
- Cold start (no cache): 30-50ms

## Burn Rate Alert Calculations

### Understanding Burn Rates

**Burn rate** = How fast you're consuming error budget relative to the sustainable rate

- **Burn rate 1.0** = Consuming budget at exactly the SLO rate (will exhaust in 30 days)
- **Burn rate 14.4** = Consuming budget 14.4× faster (will exhaust in ~2 days)
- **Burn rate 6** = Consuming budget 6× faster (will exhaust in ~5 days)

**Formula:**
```
Burn Rate = (Current Error Rate) / (SLO Error Budget)

For 99.9% SLO:
- SLO Error Budget = 0.001 (0.1%)
- If current error rate = 0.0144 (1.44%):
  Burn Rate = 0.0144 / 0.001 = 14.4x
```

### Multi-Window Pattern

Google SRE Workbook recommends requiring **both** a long window AND short window to exceed threshold before alerting. This reduces false positives by 90%+ while maintaining fast incident detection.

**Fast Burn Alerts (Critical):**
- Long window: 1 hour
- Short window: 5 minutes
- Both must exceed 14.4× burn rate
- Purpose: Page on-call for immediate response
- Time to exhaustion: ~2 days at current rate

**Slow Burn Alerts (Warning):**
- Long window: 6 hours
- Short window: 30 minutes
- Both must exceed 6× burn rate
- Purpose: Create ticket for investigation during business hours
- Time to exhaustion: ~5 days at current rate

### Why This Matters

**Without multi-window pattern:**
- Single 1m window: Alerts on every transient spike (high false positives)
- Single 1h window: Slow to detect issues (problem may resolve before alert fires)

**With multi-window pattern:**
- Long window: Filters out transient spikes
- Short window: Confirms problem is still occurring
- Both required: Reduces alert fatigue while maintaining fast detection

## Alert Response Procedures

### DNSAvailabilitySLOFastBurn

**Severity:** Critical
**Burn Rate:** 14.4× (error budget exhausted in ~2 days)
**Windows:** 1h + 5m
**Paging:** Yes (immediate response required)

**What it means:**
DNS queries are failing at 14.4× the acceptable rate. At this rate, the entire monthly error budget (43.8 minutes) will be exhausted in approximately 2 days.

**Immediate Actions (first 5 minutes):**

1. **Acknowledge alert** in PagerDuty/Slack
2. **Check SLO dashboard** in Grafana: `/d/nebula-dns-slo/`
   - Confirm current availability percentage
   - Check error budget remaining
   - Identify which probes are failing (region, protocol)
3. **Check DNS Overview dashboard**: `/d/dns-overview/`
   - Verify dnsdist, policy-svc, Unbound are up
   - Check query success rates
   - Look for SERVFAIL spike
4. **Check infrastructure health**:
   ```bash
   kubectl get pods -n nebula-dns | grep -E 'dnsdist|policy-svc|unbound'
   kubectl top pods -n nebula-dns
   ```
5. **Check external reachability**:
   ```bash
   dig @dns1.staging.nebuladns.io google.com
   curl -H "accept: application/dns-message" https://doh.staging.nebuladns.io/dns-query?dns=...
   ```

**Escalation Path:**

- **0-15 min:** On-call engineer investigates
- **15-30 min:** If not resolved, escalate to on-call lead
- **30-60 min:** If not resolved, escalate to engineering manager + page backup on-call
- **60+ min:** Declare incident, start incident response process

**Resolution Steps:**

**If dnsdist pods failing:**
```bash
kubectl logs -n nebula-dns -l app=dnsdist --tail=100
kubectl describe pod -n nebula-dns -l app=dnsdist
# Check for OOMKill, CrashLoopBackOff, or resource exhaustion
# Restart if needed: kubectl rollout restart deployment/dnsdist -n nebula-dns
```

**If policy-svc failing:**
```bash
kubectl logs -n nebula-dns -l app=policy-svc --tail=100
# Check for Redis connection errors, ClickHouse write failures
# Verify Redis connectivity: kubectl exec -it <policy-svc-pod> -- redis-cli -h <redis-host> PING
```

**If Unbound failing:**
```bash
kubectl logs -n nebula-dns -l app=unbound --tail=100
kubectl exec -it <unbound-pod> -n nebula-dns -- drill @127.0.0.1 google.com
# Check for upstream DNS failures, root hints issues
```

**If infrastructure issue (load balancer, nodes):**
```bash
kubectl get nodes
doctl compute load-balancer list
doctl compute load-balancer get <lb-id>
# Check DigitalOcean console for platform issues
```

**Post-Resolution:**
- Document root cause in incident report
- Update runbook if new failure mode discovered
- Schedule postmortem if error budget consumed >10%

---

### DNSAvailabilitySLOSlowBurn

**Severity:** Warning
**Burn Rate:** 6× (error budget exhausted in ~5 days)
**Windows:** 6h + 30m
**Paging:** No (business hours investigation)

**What it means:**
DNS queries are failing at 6× the acceptable rate. Not immediately critical, but requires investigation to prevent budget exhaustion.

**Actions (during business hours):**

1. **Acknowledge alert** in Slack
2. **Review SLO dashboard** for trends
   - Is burn rate increasing or decreasing?
   - Which time periods show elevated error rates?
3. **Create GitHub issue** with template:
   ```
   Title: DNS Availability Slow Burn - Error Budget at X%

   Alert: DNSAvailabilitySLOSlowBurn
   Burn Rate: 6x
   Error Budget Remaining: X%
   Time to Exhaustion: ~5 days

   Investigation:
   - [ ] Check recent deployments (last 6h)
   - [ ] Review Grafana DNS Overview dashboard
   - [ ] Check connection pool metrics
   - [ ] Review slow query logs
   - [ ] Verify external probe regions

   Action Items:
   - [ ] TBD based on findings
   ```
4. **Investigate recent changes**:
   ```bash
   git log --since="6 hours ago" --oneline
   kubectl rollout history deployment/dnsdist -n nebula-dns
   kubectl rollout history deployment/policy-svc -n nebula-dns
   ```
5. **Check for gradual degradation**:
   - Connection pool exhaustion (PostgreSQL, Redis)
   - Memory leaks (increasing heap usage)
   - Disk space (ClickHouse, logs)
   - Cache hit rate degradation

**Escalation Path:**
- If burn rate increases to >10×, escalate to DNSAvailabilitySLOFastBurn procedure
- If root cause unclear after 2 hours, discuss in team sync
- If error budget drops below 25%, consider feature freeze (see Error Budget Policy)

**Resolution:**
- Address root cause identified in investigation
- Monitor for 24h to confirm burn rate returns to <1×
- Update GitHub issue with resolution notes
- Close issue when error budget consumption returns to normal

---

### APIAvailabilitySLOFastBurn

**Severity:** Critical
**Burn Rate:** 14.4× (error budget exhausted in ~2 days)
**Windows:** 1h + 5m
**Paging:** Yes (immediate response required)

**What it means:**
API requests are returning 5xx errors at 14.4× the acceptable rate. At this rate, the monthly error budget will be exhausted in ~2 days.

**Immediate Actions (first 5 minutes):**

1. **Acknowledge alert**
2. **Check SLO dashboard**: `/d/nebula-dns-slo/`
   - Current availability percentage
   - Error budget remaining
   - Which endpoints are failing (login, policies, locations, reports)
3. **Check API Performance dashboard**: `/d/api-performance/`
   - Request rate (QPS)
   - Error rate by status code (500, 502, 503, 504)
   - Latency distribution
4. **Check API pods**:
   ```bash
   kubectl get pods -n nebula-dns -l app=api
   kubectl top pods -n nebula-dns -l app=api
   kubectl logs -n nebula-dns -l app=api --tail=100 | grep -i error
   ```
5. **Check database connectivity**:
   ```bash
   kubectl logs -n nebula-dns -l app=api --tail=100 | grep -i "connection"
   # Look for "connection refused", "too many connections", "timeout"
   ```

**Common Root Causes:**

**500 Internal Server Error:**
- Unhandled exceptions in API code
- Database query errors (syntax, constraint violations)
- Redis connection failures
- ClickHouse write errors (analytics logging)

**502 Bad Gateway:**
- API pods crashing (OOMKill, CrashLoopBackOff)
- API pods not ready (failing readiness probe)
- Ingress controller misconfiguration

**503 Service Unavailable:**
- API pods at max capacity (HPA not scaling fast enough)
- Database connection pool exhausted
- Deployment in progress (rolling update)

**504 Gateway Timeout:**
- API requests timing out (>30s)
- Slow database queries (missing indexes)
- ClickHouse aggregation timeout

**Resolution Steps:**

**If API pods crashing:**
```bash
kubectl describe pod -n nebula-dns <api-pod-name>
# Look for OOMKilled, CrashLoopBackOff
# If OOM: Increase memory limits in deployment
# If Crash: Check logs for stack trace, fix code issue
```

**If connection pool exhausted:**
```bash
# Check PostgresConnectionPoolExhaustion alert (should also be firing)
# Immediate mitigation: Scale API pods to reduce load per pod
kubectl scale deployment/api -n nebula-dns --replicas=10
# Long-term: Increase PgBouncer pool size or optimize queries
```

**If slow queries:**
```bash
# Check PostgreSQL slow query log
kubectl exec -it <postgres-pod> -- psql -U postgres -c "SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
# Identify missing indexes, add them, or optimize query
```

**If deployment in progress:**
```bash
kubectl rollout status deployment/api -n nebula-dns
# If rollout stuck, check new pod logs for startup errors
# Rollback if new version is broken:
kubectl rollout undo deployment/api -n nebula-dns
```

**Escalation Path:**
- Same as DNSAvailabilitySLOFastBurn
- 0-15 min: On-call engineer
- 15-30 min: On-call lead
- 30-60 min: Engineering manager + backup on-call
- 60+ min: Declare incident

---

### APIAvailabilitySLOSlowBurn

**Severity:** Warning
**Burn Rate:** 6× (error budget exhausted in ~5 days)
**Windows:** 6h + 30m
**Paging:** No (business hours investigation)

**What it means:**
API error rate is elevated but not critical. Requires investigation to prevent escalation to fast burn.

**Actions (same process as DNSAvailabilitySLOSlowBurn):**
1. Create GitHub issue
2. Review recent deployments
3. Check API Performance dashboard for trends
4. Investigate connection pools, memory usage, slow queries
5. Monitor for 24h after resolution

---

### APILatencySLOFastBurn

**Severity:** Critical
**Threshold:** p95 > 200ms in both 1h and 5m windows
**Paging:** Yes

**What it means:**
API p95 latency is exceeding 200ms SLO target for a sustained period (not a transient spike).

**Immediate Actions:**

1. **Check API Performance dashboard**: `/d/api-performance/`
   - Which endpoints have high latency? (login, policies, locations, reports)
   - Is latency increasing over time or flat?
   - What's the request rate (QPS)?
2. **Check database query performance**:
   ```bash
   # PostgreSQL slow queries
   kubectl exec -it <postgres-pod> -- psql -U postgres -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

   # ClickHouse slow queries (if reports endpoints slow)
   kubectl exec -it <clickhouse-pod> -- clickhouse-client --query "SELECT * FROM system.query_log WHERE type='QueryFinish' ORDER BY query_duration_ms DESC LIMIT 10;"
   ```
3. **Check cache hit rates**:
   ```bash
   # Redis cache hit rate (should be >80%)
   kubectl exec -it <redis-pod> -- redis-cli INFO stats | grep keyspace_hits
   ```
4. **Check resource utilization**:
   ```bash
   kubectl top pods -n nebula-dns
   # High CPU or memory can cause latency
   ```

**Common Root Causes:**
- Missing database indexes (new queries introduced)
- Cache invalidation storm (all keys expired simultaneously)
- High request rate (QPS spike without scaling)
- Slow ClickHouse aggregations (large time ranges)
- Upstream service latency (Stripe API for billing endpoints)

**Resolution:**
- Add missing indexes
- Increase cache TTL or stagger expirations
- Scale API pods horizontally (HPA)
- Optimize ClickHouse queries (add materialized views)
- Add circuit breaker for upstream services

---

### APILatencySLOSlowBurn

**Severity:** Warning
**Threshold:** p95 > 200ms in both 6h and 30m windows
**Paging:** No

**Actions:**
- Same investigation process as fast burn, but during business hours
- Create GitHub issue for tracking
- Review recent code changes for query regressions

---

### PolicyEvalLatencySLOFastBurn

**Severity:** Critical
**Threshold:** p95 > 50ms in both 1h and 5m windows
**Paging:** Yes

**What it means:**
Policy evaluation is slow, directly impacting DNS query latency. Critical because policy-svc is in the DNS query path.

**Immediate Actions:**

1. **Check Policy Service dashboard**: `/d/policy-service/`
   - Cache hit rate (should be >90%)
   - Evaluation duration by outcome (allow, block)
   - Redis connection health
2. **Check Redis health**:
   ```bash
   kubectl exec -it <redis-pod> -- redis-cli INFO
   # Look for: connected_clients, used_memory, keyspace_hits/misses
   ```
3. **Check policy cache**:
   ```bash
   kubectl exec -it <policy-svc-pod> -- curl localhost:8080/metrics | grep policy_cache
   # Look for cache_hit_total, cache_miss_total, cache_size_bytes
   ```

**Common Root Causes:**
- Redis connection failures (all cache misses)
- Cache invalidation storm (all tenants' policies invalidated simultaneously)
- Policy complexity (large lists, complex regex patterns)
- Redis memory exhaustion (evicting policy cache keys)

**Resolution:**
- Restart policy-svc if Redis connection broken
- Stagger policy invalidations (don't invalidate all tenants at once)
- Optimize policy matching algorithm (pre-compile regexes)
- Scale Redis vertically (increase memory) or horizontally (add replicas)

---

### PolicyEvalLatencySLOSlowBurn

**Severity:** Warning
**Threshold:** p95 > 50ms in both 6h and 30m windows
**Paging:** No

**Actions:**
- Same investigation as fast burn, during business hours
- Focus on cache hit rate optimization
- Review policy complexity and list sizes

---

### PostgresConnectionPoolExhaustion

**Severity:** Critical
**Threshold:** >90% of PgBouncer connections in use
**Paging:** Yes

**What it means:**
PgBouncer connection pool is nearly exhausted. New API requests will be queued, causing latency spikes and potential timeouts.

**Immediate Actions:**

1. **Check connection count**:
   ```bash
   kubectl exec -it <pgbouncer-pod> -- psql -p 6432 -U postgres pgbouncer -c "SHOW POOLS;"
   # Look for cl_active (active connections) vs maxwait (queued connections)
   ```
2. **Identify connection leaks**:
   ```bash
   kubectl logs -n nebula-dns -l app=api --tail=500 | grep -i "connection"
   # Look for "connection not released", "timeout acquiring connection"
   ```
3. **Check long-running queries**:
   ```bash
   kubectl exec -it <postgres-pod> -- psql -U postgres -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;"
   # Kill long-running queries if blocking others:
   # SELECT pg_terminate_backend(<pid>);
   ```

**Immediate Mitigation:**
```bash
# Scale API pods to distribute connections
kubectl scale deployment/api -n nebula-dns --replicas=10

# If critical, increase PgBouncer pool size temporarily:
# Edit ConfigMap pgbouncer-config, change max_client_conn from 50 to 100
kubectl edit configmap pgbouncer-config -n nebula-dns
kubectl rollout restart deployment/pgbouncer -n nebula-dns
```

**Root Causes:**
- Connection leaks in API code (not releasing connections)
- High request rate without connection pooling in app
- Long-running queries holding connections
- Too few PgBouncer connections for current scale

**Resolution:**
- Fix connection leaks in code (ensure `.release()` called)
- Increase PgBouncer pool size
- Optimize long-running queries
- Enable connection pooling in NestJS TypeORM config

---

### RedisConnectionPoolExhaustion

**Severity:** Warning
**Threshold:** >80% of Redis max_clients in use
**Paging:** No (business hours investigation)

**What it means:**
Redis connection count is elevated. Less critical than PostgreSQL because Redis connection setup is faster.

**Actions:**

1. **Check Redis connection count**:
   ```bash
   kubectl exec -it <redis-pod> -- redis-cli INFO clients
   # connected_clients vs maxclients
   ```
2. **Identify high connection consumers**:
   ```bash
   kubectl exec -it <redis-pod> -- redis-cli CLIENT LIST
   # Look for pods with many connections
   ```
3. **Check for connection leaks**:
   ```bash
   kubectl logs -n nebula-dns -l app=policy-svc --tail=500 | grep -i redis
   kubectl logs -n nebula-dns -l app=api --tail=500 | grep -i redis
   ```

**Mitigation:**
- Scale API and policy-svc pods if needed
- Increase Redis maxclients config
- Implement connection pooling in Redis clients

**Root Causes:**
- Connection pooling not enabled in app
- Stale connections not cleaned up
- Too many pub/sub subscriptions

---

## Error Budget Policy

The error budget policy defines **what actions to take based on remaining error budget**. This ensures the team balances feature velocity with reliability.

### Policy Thresholds

| Error Budget Remaining | Status | Action Required |
|------------------------|--------|-----------------|
| **>50%** | 🟢 Green | Ship features freely, maintain velocity |
| **25-50%** | 🟡 Yellow | Prioritize reliability, review recent changes |
| **<25%** | 🟠 Orange | Feature freeze, focus on reliability improvements |
| **0% (exhausted)** | 🔴 Red | Incident review, postmortem required, no new features |

### Green Zone (>50% Budget Remaining)

**What it means:**
SLOs are healthy, error budget is being consumed at acceptable rate.

**Actions:**
- ✅ Ship new features as planned
- ✅ Deploy multiple times per day if needed
- ✅ Run experiments (A/B tests, canary deployments)
- ✅ Maintain normal velocity

**Monitoring:**
- Weekly SLO review in team sync
- Automated weekly load tests (Monday 2 AM UTC)

---

### Yellow Zone (25-50% Budget Remaining)

**What it means:**
Error budget consumption is elevated. Not critical yet, but requires increased attention to reliability.

**Actions:**
- ⚠️ **Prioritize reliability work** over new features
- ⚠️ **Review recent changes** (last 7 days):
  ```bash
  git log --since="7 days ago" --oneline --all
  kubectl rollout history deployment/api -n nebula-dns
  kubectl rollout history deployment/policy-svc -n nebula-dns
  ```
- ⚠️ **Analyze error patterns**:
  - Which endpoints/services are consuming budget?
  - Are errors clustered in time (incident) or distributed (systemic issue)?
  - What's the trend (improving or degrading)?
- ⚠️ **Reduce deployment frequency**:
  - Deploy only critical fixes and reliability improvements
  - Increase canary duration (1h → 4h)
  - Require manual approval for production deploys

**Weekly Review:**
- Discuss error budget consumption in team sync
- Create action items for reliability improvements
- Set target to return to Green Zone within 2 weeks

---

### Orange Zone (<25% Budget Remaining)

**What it means:**
Error budget is critically low. Feature freeze required to prevent complete budget exhaustion.

**Actions:**
- 🛑 **Feature freeze**: No new feature deployments
- 🛑 **Only deploy**:
  - Critical security patches
  - Bug fixes that improve reliability
  - Rollbacks of recent changes
- 🛑 **Daily standups** focused on reliability:
  - What's consuming error budget?
  - What reliability work is in progress?
  - What can we do today to improve?
- 🛑 **Investigate root causes**:
  - Run load tests to reproduce issues
  - Analyze slow query logs
  - Review monitoring dashboards for patterns
- 🛑 **Implement improvements**:
  - Add missing indexes
  - Optimize slow queries
  - Increase connection pool sizes
  - Scale services horizontally
  - Fix connection leaks

**Communication:**
- Notify stakeholders of feature freeze
- Update roadmap to reflect delayed features
- Provide daily updates on progress toward Green Zone

**Exit Criteria:**
- Error budget returns to >25% (Yellow Zone)
- No fast burn alerts for 7 consecutive days
- Root cause identified and mitigated

---

### Red Zone (0% Budget Exhausted)

**What it means:**
SLO has been violated. The service failed to meet its reliability target for the measurement period (30 days).

**Actions:**
- 🚨 **Declare incident** (follow incident response process)
- 🚨 **Immediate postmortem** (within 48 hours):
  - Timeline of events
  - Root cause analysis (5 Whys)
  - Action items with owners and due dates
- 🚨 **Extended feature freeze** until error budget recovers to Yellow Zone (>25%)
- 🚨 **Executive communication**:
  - Notify engineering leadership
  - Provide executive summary of incident
  - Present action plan for preventing recurrence

**Postmortem Template:**
```markdown
# SLO Violation Postmortem - [Date]

## Summary
- SLO: [DNS Availability / API Availability]
- Target: 99.9%
- Actual: XX.X%
- Error Budget Consumed: 100% + XX% over

## Timeline
- [Date Time]: Initial alert fired
- [Date Time]: Root cause identified
- [Date Time]: Mitigation deployed
- [Date Time]: Service recovered

## Root Cause
- Primary: [e.g., database connection pool exhausted]
- Contributing factors: [e.g., unexpected traffic spike, missing monitoring]

## Impact
- Duration: X hours
- Affected users: [all / subset]
- Error budget impact: -XX%

## Action Items
- [ ] [Action 1] - Owner: [name] - Due: [date]
- [ ] [Action 2] - Owner: [name] - Due: [date]

## Lessons Learned
- What went well: [e.g., fast detection, clear runbook]
- What could be improved: [e.g., better monitoring, faster escalation]
```

**Recovery Plan:**
- All action items from postmortem completed before exiting Red Zone
- Reliability improvements validated with load tests
- SLO targets reviewed (if unrealistic, update SLO definition)

---

## Dashboard Links

### Grafana Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| **SLO Overview** | `/d/nebula-dns-slo/` | Error budget, burn rate, SLO compliance |
| **API Performance** | `/d/api-performance/` | Request rate, latency, errors by endpoint |
| **DNS Overview** | `/d/dns-overview/` | Query success rate, SERVFAIL, protocol breakdown |
| **Policy Service** | `/d/policy-service/` | Cache hit rate, eval latency, Redis health |
| **Database Metrics** | `/d/database/` | Connection pools, slow queries, replication lag |
| **Infrastructure** | `/d/infrastructure/` | Node CPU/memory, pod status, network I/O |

### Prometheus Alert Manager

- **Alert List:** `<prometheus-url>/alerts`
- **Silences:** `<prometheus-url>/silences`

### DigitalOcean Console

- **Kubernetes Cluster:** `https://cloud.digitalocean.com/kubernetes/clusters`
- **Load Balancers:** `https://cloud.digitalocean.com/networking/load_balancers`
- **Managed Databases:** `https://cloud.digitalocean.com/databases`

---

## Monitoring Architecture

### SLO Metrics Collection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Availability SLOs                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────┐
        │     Blackbox Exporter (DNS)           │
        │  - probe_success (DoH, DoT, UDP)      │
        │  - probe_duration_seconds             │
        │  - 30s interval from staging          │
        └───────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────┐
        │      API Service Instrumentation      │
        │  - http_requests_total{status}        │
        │  - http_request_duration_seconds      │
        │  - Per-endpoint labels                │
        └───────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────┐
        │          Prometheus                    │
        │  - Scrapes metrics every 15s           │
        │  - Evaluates alert rules every 30s     │
        │  - Retains 30d for SLO calculations    │
        └───────────────────────────────────────┘
                                │
                    ┌───────────┴──────────┐
                    ▼                      ▼
        ┌─────────────────────┐  ┌──────────────────┐
        │  Burn Rate Alerts   │  │  Grafana SLO     │
        │  - Fast: 1h+5m      │  │  Dashboard       │
        │  - Slow: 6h+30m     │  │  - Error budget  │
        │  - PagerDuty page   │  │  - Burn rate viz │
        └─────────────────────┘  └──────────────────┘
```

### Synthetic Probe Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Blackbox Exporter (in DOKS cluster)                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────┐
        │   External DNS Endpoints (probed)     │
        │  - dns1.staging.nebuladns.io:853      │
        │  - dns2.staging.nebuladns.io:853      │
        │  - doh.staging.nebuladns.io:443       │
        └───────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────┐
        │     DNS Resolution Path               │
        │  DO LB → dnsdist → policy-svc         │
        │              ↓                         │
        │         Unbound (resolver)             │
        └───────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────┐
        │  Probe Results Exported to Prometheus │
        │  - probe_success (0 or 1)              │
        │  - probe_duration_seconds              │
        │  - Labels: instance, module, protocol  │
        └───────────────────────────────────────┘
```

**Key Points:**
- Blackbox Exporter runs **inside** DOKS cluster initially (single region)
- Probes external endpoints to measure user-facing availability
- Future: Multi-region probes via DigitalOcean Uptime (Phase 33)
- Probes run every 30s (2 probes/min = 120 samples/hour for burn rate calculations)

### Latency Metrics Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Application Instrumentation                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴──────────────┐
                    ▼                          ▼
        ┌─────────────────────┐    ┌─────────────────────┐
        │  API (NestJS)       │    │  Policy-Svc (Go)    │
        │  - HTTP middleware  │    │  - Prometheus hist  │
        │  - histogram_bucket │    │  - eval duration    │
        │  - Per-endpoint     │    │  - Per-outcome      │
        └─────────────────────┘    └─────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────┐
        │          Prometheus                    │
        │  - Calculates p95 via histogram_      │
        │    quantile()                          │
        │  - 5m window for fast detection        │
        │  - Multi-window burn rate alerts       │
        └───────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────┐
        │      Grafana Latency Panels           │
        │  - p50/p95/p99 time series             │
        │  - Heatmap visualization               │
        │  - SLO threshold lines (200ms, 50ms)   │
        └───────────────────────────────────────┘
```

---

## Appendix: PromQL Query Reference

### Error Budget Remaining (DNS)

```promql
(
  0.001 -
  (1 - sum(rate(probe_success{job="blackbox-dns"}[30d])) / count(probe_success{job="blackbox-dns"}))
) / 0.001 * 100
```

**Interpretation:**
- 100% = Full error budget remaining
- 50% = Half error budget consumed
- 0% = Budget exhausted (SLO violated)

### Burn Rate (API Availability)

```promql
(
  sum(rate(http_requests_total{job="api",status=~"5.."}[1h]))
  / sum(rate(http_requests_total{job="api"}[1h]))
) / 0.001
```

**Interpretation:**
- 1.0 = Consuming budget at sustainable rate (will exhaust in 30d)
- 14.4 = Fast burn (will exhaust in ~2d)
- 6.0 = Slow burn (will exhaust in ~5d)

### API p95 Latency

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="api"}[5m])) by (le)) * 1000
```

**Interpretation:**
- Value in milliseconds
- Compare to 200ms SLO target

### Policy Eval p95 Latency

```promql
histogram_quantile(0.95, sum(rate(policy_evaluation_duration_seconds_bucket{job="policy-svc"}[5m])) by (le)) * 1000
```

**Interpretation:**
- Value in milliseconds
- Compare to 50ms SLO target

---

**Document Version:** 1.0
**Last Updated:** 2026-02-15
**Next Review:** 2026-03-15 (monthly)
**Changelog:**
- 2026-02-15: Initial version created in Phase 31 Plan 05
