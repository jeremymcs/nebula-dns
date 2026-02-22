# Runbook: Database Failure (PostgreSQL / ClickHouse)

// Nebula DNS - Database Failure Incident Response
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Severity:** Critical
**Services Affected:** API, Policy Service, ClickHouse analytics
**Related Alerts:** PostgresConnectionPoolExhaustion, APIAvailabilitySLOFastBurn, DatabaseDown

## Quick Actions (DO THIS FIRST)

⏱️ **Target: 5 minutes to initial diagnosis**

- [ ] 1. Check DigitalOcean Managed PostgreSQL dashboard: https://cloud.digitalocean.com/databases
- [ ] 2. Test PostgreSQL connectivity: `kubectl exec -n nebula-dns deploy/api -- psql $DATABASE_URL -c "SELECT 1"`
- [ ] 3. Check API logs for connection errors: `kubectl logs -n nebula-dns deploy/api --tail=50 | grep -i "database\|postgres\|connection"`
- [ ] 4. Check PgBouncer connection pool: `kubectl logs -n nebula-dns deploy/pgbouncer --tail=50` (if using)
- [ ] 5. Check ClickHouse Cloud status: https://clickhouse.cloud/status or check dashboard
- [ ] 6. Test ClickHouse connectivity: `kubectl exec -n nebula-dns deploy/policy-svc -- curl -v $CLICKHOUSE_URL`
- [ ] 7. If PostgreSQL maintenance → Wait for completion or failover to standby node
- [ ] 8. If connection pool exhausted → Scale API pods: `kubectl scale deployment/api -n nebula-dns --replicas=10`
- [ ] 9. If credential rotation → Update Kubernetes secrets from DigitalOcean console
- [ ] 10. If network partition → Check DigitalOcean VPC firewall rules

---

## Diagnostic Context

### Common Causes (by frequency)

#### PostgreSQL Failures

1. **DigitalOcean managed DB maintenance** (40%) — Planned maintenance window, automatic failover, brief downtime
2. **Connection pool exhaustion** (30%) — PgBouncer max_client_conn reached, API pods not releasing connections
3. **Credential rotation** (15%) — Database password changed in DO console but not updated in Kubernetes secrets
4. **Network partition** (15%) — VPC connectivity issues, firewall rule blocking database port, DNS resolution failure for database hostname

#### ClickHouse Failures

1. **ClickHouse Cloud maintenance** (35%) — Service upgrade, cluster scaling, brief unavailability
2. **Query timeout** (25%) — Large aggregation queries exceeding timeout, runaway queries
3. **Disk space exhaustion** (20%) — Log retention policy not working, partition growth exceeds limit
4. **Network issues** (20%) — TLS handshake failure, DNS resolution failure for Cloud endpoint

### How Database Connectivity Works

#### PostgreSQL Connection Flow

```
API Pod → PgBouncer (transaction mode) → DigitalOcean Managed PostgreSQL
                                              ↓
                                        Primary Node (read/write)
                                        Standby Node (automatic failover)
```

- **Pooled connection:** Used for application queries via PgBouncer (50 connections, transaction mode)
- **Direct connection:** Used for database migrations (bypasses PgBouncer to avoid transaction mode issues with DDL)
- **High Availability:** DigitalOcean provides automatic failover to standby node (brief downtime ~30s)

#### ClickHouse Connection Flow

```
Policy Service → ClickHouse Cloud (HTTPS) → Cluster
                                                ↓
                                          Replicated tables
                                          Distributed queries
```

- **Analytics only:** ClickHouse is non-critical dependency (logged as degraded but doesn't fail readiness probe)
- **Batch writes:** Policy Service buffers query logs and flushes every 5s or 1000 records
- **Retry logic:** Failed writes are retried with exponential backoff

### Warning Signs

- `pg_up` metric drops to 0 (PostgreSQL unreachable)
- `pgbouncer_stats_avg_wait_time_seconds` increases (pool exhaustion)
- `clickhouse_ping_success` drops to 0 (ClickHouse unreachable)
- API logs show repeated "connection refused" or "timeout" errors
- Pod restart count increases due to failing readiness probes

### Related Alerts

- **PostgresConnectionPoolExhaustion** → >90% of PgBouncer connections in use (critical, scale API pods)
- **APIAvailabilitySLOFastBurn** → API returning 502/503 errors due to database unavailability
- **DatabaseDown** → PostgreSQL unreachable for 1+ minute
- **ClickHouseWriteErrors** → ClickHouse writes failing (warning, analytics degraded)

### Resolution Procedures

#### PostgreSQL Maintenance Window

**Symptoms:**
- DigitalOcean dashboard shows "Maintenance in progress"
- Brief connection errors during failover (~30s)
- Automatic recovery after maintenance completes

**Steps:**
```bash
# 1. Check maintenance status in DigitalOcean console
# https://cloud.digitalocean.com/databases

# 2. If maintenance is planned and notification received, no action needed
# Wait for automatic failover (typically completes in 30-60 seconds)

# 3. Monitor API error rate during maintenance:
kubectl logs -n nebula-dns deploy/api --tail=100 -f | grep -i error

# 4. Verify connection restored after maintenance:
kubectl exec -n nebula-dns deploy/api -- psql $DATABASE_URL -c "SELECT current_database(), version();"

# 5. Check if standby was promoted to primary:
# DigitalOcean console will show new primary node

# 6. No further action required unless maintenance window exceeds SLO error budget
```

#### Connection Pool Exhaustion

**Symptoms:**
- API requests timing out or returning 503 errors
- PgBouncer logs show "no more connections available"
- `pgbouncer_stats_avg_wait_time_seconds` metric high

**Steps:**
```bash
# 1. Check current connection pool usage
# If using PgBouncer pod:
kubectl exec -n nebula-dns deploy/pgbouncer -- psql -p 6432 -U postgres pgbouncer -c "SHOW POOLS;"
# Look for: cl_active (active) vs cl_waiting (queued)

# 2. Identify connection leaks in API code
kubectl logs -n nebula-dns deploy/api --tail=500 | grep -i "connection"
# Look for: "connection not released", "timeout acquiring connection"

# 3. Check long-running queries holding connections
kubectl exec -n nebula-dns deploy/api -- psql $DATABASE_DIRECT_URL -c "
  SELECT pid, now() - query_start AS duration, query
  FROM pg_stat_activity
  WHERE state = 'active'
  ORDER BY duration DESC
  LIMIT 10;
"

# 4. IMMEDIATE MITIGATION - Scale API pods to distribute connections:
kubectl scale deployment/api -n nebula-dns --replicas=10

# 5. If critical, increase PgBouncer pool temporarily (requires pod restart):
# Edit values-production.yaml:
# pgbouncer.maxClientConn: 50 → 100
helm upgrade nebula-dns ./helm/safedns -n nebula-dns -f helm/safedns/values-production.yaml --atomic

# 6. Long-term fix - Add connection pooling in API code:
# Ensure TypeORM connection pool configured:
# api/src/database/database.module.ts
# extra: { max: 20, idleTimeoutMillis: 30000 }

# 7. Kill long-running queries if blocking others:
# kubectl exec -n nebula-dns deploy/api -- psql $DATABASE_DIRECT_URL -c "SELECT pg_terminate_backend(<pid>);"
```

#### Credential Rotation

**Symptoms:**
- API logs show "password authentication failed"
- Connection attempts fail with 401 errors
- Works in DigitalOcean console but not from API pods

**Steps:**
```bash
# 1. Verify current database password in DigitalOcean console
# https://cloud.digitalocean.com/databases → Connection Details

# 2. Check current Kubernetes secret
kubectl get secret api-secrets -n nebula-dns -o jsonpath='{.data.DATABASE_URL}' | base64 -d
# Verify password matches DigitalOcean console

# 3. If password mismatch, update secret:
# Run the secret update script from Phase 24-04:
cd scripts
./update-secrets.sh
# Follow prompts to update DATABASE_URL with new password

# 4. Restart API pods to pick up new secret:
kubectl rollout restart deployment/api -n nebula-dns
kubectl rollout status deployment/api -n nebula-dns --timeout=300s

# 5. Verify connection works:
kubectl exec -n nebula-dns deploy/api -- psql $DATABASE_URL -c "SELECT 1;"

# 6. Check API health endpoint:
kubectl exec -n nebula-dns deploy/api -- curl localhost:3000/health
# Should show: postgres: { status: 'healthy' }
```

#### Network Partition / VPC Firewall

**Symptoms:**
- Connection timeouts (not authentication failures)
- "Connection refused" or "Network unreachable" errors
- Works from some pods but not others

**Steps:**
```bash
# 1. Test network connectivity from API pod
kubectl exec -n nebula-dns deploy/api -- ping -c 3 <postgres-hostname>
kubectl exec -n nebula-dns deploy/api -- nc -zv <postgres-hostname> 25060

# 2. Check DigitalOcean VPC firewall rules
doctl compute firewall list
doctl compute firewall get <firewall-id>
# Verify rule allowing DOKS cluster to reach database on port 25060

# 3. Check if database is in correct VPC:
# DigitalOcean console → Databases → Networking tab
# Should be: Private network (VPC) enabled, same VPC as DOKS cluster

# 4. Check DNS resolution for database hostname:
kubectl exec -n nebula-dns deploy/api -- nslookup <postgres-hostname>
# Should resolve to private VPC IP (10.x.x.x)

# 5. If firewall issue, update rules via Terraform or DigitalOcean console:
# terraform/modules/databases/main.tf
# Add cluster IP range to allowed sources

# 6. If DNS resolution fails, check CoreDNS:
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

#### ClickHouse Cloud Unavailable

**Symptoms:**
- Policy Service logs show "ClickHouse write failed"
- Analytics queries failing in UI
- Non-critical (service continues operating, analytics degraded)

**Steps:**
```bash
# 1. Check ClickHouse Cloud status page
# https://clickhouse.cloud/status

# 2. Test connectivity from Policy Service pod
kubectl exec -n nebula-dns deploy/policy-svc -- curl -v https://<clickhouse-host>:8443/ping

# 3. Check Policy Service logs for batch flush errors
kubectl logs -n nebula-dns deploy/policy-svc --tail=100 | grep -i clickhouse

# 4. Verify ClickHouse Cloud credentials
kubectl get secret api-secrets -n nebula-dns -o jsonpath='{.data.CLICKHOUSE_PASSWORD}' | base64 -d
# Compare with ClickHouse Cloud console

# 5. If credentials rotated, update secrets and restart:
cd scripts
./update-secrets.sh
kubectl rollout restart deployment/policy-svc -n nebula-dns

# 6. If Cloud service degraded, wait for recovery
# Analytics will be delayed but DNS queries continue working (fail-open behavior)

# 7. Monitor batch queue size to prevent memory exhaustion:
kubectl exec -n nebula-dns deploy/policy-svc -- curl localhost:8080/metrics | grep clickhouse_batch_queue_size
# If queue growing unbounded (>10000), consider restarting policy-svc to drop buffered logs
```

#### Database Migration Failure

**Symptoms:**
- Deployment stuck during Helm upgrade (migration pre-hook fails)
- Logs show "migration failed" or SQL syntax errors
- API pods can't start (waiting for migration to complete)

**Steps:**
```bash
# 1. Check migration job status
kubectl get jobs -n nebula-dns | grep migration
kubectl logs -n nebula-dns job/db-migration --tail=100

# 2. If migration failed due to timeout, increase timeout:
# helm/safedns/values-production.yaml
# migrations.timeout: 900s → 1800s

# 3. If migration has SQL error, rollback migration:
cd scripts
./rollback-migration.sh
# Follow prompts to rollback last migration

# 4. Fix migration SQL, commit, redeploy:
# api/src/database/migrations/<timestamp>-name.ts

# 5. Re-run migration manually if needed:
kubectl delete job db-migration -n nebula-dns
kubectl apply -f k8s/base/jobs/db-migration-job.yaml
kubectl logs -n nebula-dns job/db-migration -f

# 6. Once migration succeeds, complete Helm upgrade:
helm upgrade nebula-dns ./helm/safedns -n nebula-dns -f helm/safedns/values-production.yaml --atomic
```

### Post-Incident

After resolution, verify the following:

1. **Database connectivity restored:**
   ```bash
   kubectl exec -n nebula-dns deploy/api -- psql $DATABASE_URL -c "SELECT current_database();"
   kubectl exec -n nebula-dns deploy/policy-svc -- curl $CLICKHOUSE_URL/ping
   ```

2. **Connection pool healthy:**
   ```bash
   # PgBouncer stats (if using):
   kubectl exec -n nebula-dns deploy/pgbouncer -- psql -p 6432 -U postgres pgbouncer -c "SHOW STATS;"
   # cl_waiting should be 0 (no queued connections)
   ```

3. **API health checks passing:**
   ```bash
   kubectl get pods -n nebula-dns -l app=api
   kubectl exec -n nebula-dns deploy/api -- curl localhost:3000/health
   # postgres: { status: 'healthy' }
   ```

4. **Metrics recovering:**
   - Check Grafana Database Metrics dashboard
   - `pg_up` returning to 1 (PostgreSQL reachable)
   - `pgbouncer_stats_avg_wait_time_seconds` decreasing
   - API error rate returning to baseline

5. **Document in incident report:**
   - Root cause (maintenance, pool exhaustion, credential rotation, network issue)
   - Impact on API availability and error budget consumed
   - Long-term fixes (increase pool size, optimize queries, add monitoring)

### Cross-References

- [API Availability SLO Runbook](../slo-runbook.md) — Error budget policy and escalation procedures
- [Deployment Runbook](deployment.md) — Database migration procedures during deployment
- [Rollback Runbook](rollback.md) — How to rollback failed database migrations

---

**Runbook Version:** 1.0
**Last Updated:** 2026-02-21
**Owner:** DevOps/SRE Team
