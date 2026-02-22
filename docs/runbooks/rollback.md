# Runbook: Deployment Rollback Procedure

// Nebula DNS - Deployment Rollback Procedure
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Version:** 1.0
**Last Updated:** 2026-02-21
**Owner:** DevOps/SRE Team
**Purpose:** Document safe rollback procedures for failed or problematic deployments

## Overview

This runbook documents procedures for rolling back Nebula DNS deployments when issues are detected post-deployment. Rollbacks use Helm's built-in rollback functionality to revert to the previous known-good release.

**Rollback Strategy:** Helm rollback with verification
- **Speed:** Rollback completes in 2-5 minutes (faster than rolling update)
- **Safety:** Automatic with `helm rollback`, preserves release history
- **Limitation:** Database migrations may not be reversible (requires manual intervention)

---

## When to Rollback

Initiate rollback immediately if any of these conditions occur:

### Critical (Immediate Rollback Required)

- [ ] **Error rate exceeds 1%** after deployment (DNS or API failures)
- [ ] **p95 latency >200ms** sustained for 5+ minutes (breaches SLO)
- [ ] **Health check endpoints returning 503** for multiple pods
- [ ] **CrashLoopBackOff on new pods** that can't be quickly resolved
- [ ] **Database connection pool exhausted** (>90% usage, API timeouts)
- [ ] **DNS probe success rate <99%** (user-facing impact)
- [ ] **Critical security vulnerability** introduced in deployment

### Warning (Consider Rollback)

- [ ] **Error rate 0.5-1%** sustained for 10+ minutes
- [ ] **p95 latency 150-200ms** sustained for 10+ minutes
- [ ] **Memory usage growing unbounded** (potential memory leak)
- [ ] **Error budget consumption >10%** in single deployment
- [ ] **Unexpected behavior** in critical features (policy evaluation, DNS resolution)

### When NOT to Rollback

- Transient errors during initial pod startup (<2 minutes)
- Brief latency spike during cache warm-up (<30 seconds)
- Single pod failure with automatic recovery
- Minor non-functional issues (UI cosmetic bugs, logging errors)

---

## Quick Rollback (DO THIS FIRST)

⏱️ **Target: 3 minutes to rollback completion**

### Step 1: Initiate Rollback

```bash
# Rollback to previous release (most common case)
helm rollback nebula-dns -n nebula-dns

# Helm automatically:
# - Reverts to previous release (revision N-1)
# - Uses rolling update strategy
# - Waits for pods to be ready
```

### Step 2: Monitor Rollback Progress

```bash
# API deployment
kubectl rollout status deployment/api -n nebula-dns --timeout=300s

# Policy Service deployment
kubectl rollout status deployment/policy-svc -n nebula-dns --timeout=300s

# dnsdist deployment
kubectl rollout status deployment/dnsdist -n nebula-dns --timeout=300s

# Unbound StatefulSet
kubectl rollout status statefulset/unbound -n nebula-dns --timeout=300s

# UI and Admin UI
kubectl rollout status deployment/ui -n nebula-dns --timeout=300s
kubectl rollout status deployment/admin-ui -n nebula-dns --timeout=300s
```

### Step 3: Verify Health

```bash
# Check all pods running
kubectl get pods -n nebula-dns

# Test health endpoints
kubectl exec -n nebula-dns deploy/api -- curl -s localhost:3000/health
kubectl exec -n nebula-dns deploy/policy-svc -- curl -s localhost:8080/health

# Test DNS resolution
drill @<loadbalancer-ip> google.com
```

### Step 4: Verify Metrics

- **Grafana SLO Dashboard:** Error rate returning to <0.1%
- **DNS Overview:** Query success rate returning to >99.9%
- **API Performance:** Latency returning to <200ms p95

### Step 5: Document and Investigate

- Document what went wrong in incident report
- Create GitHub issue for root cause analysis
- Consider: Was the issue caught by staging? If not, why?

---

## Rollback to Specific Version

If previous release also has issues, rollback to a specific known-good version.

### Step 1: List Release History

```bash
# View last 10 releases
helm history nebula-dns -n nebula-dns

# Example output:
# REVISION  UPDATED                   STATUS      CHART           APP VERSION  DESCRIPTION
# 40        2026-02-15 14:30:00 UTC   superseded  safedns-1.2.9   1.2.9        Upgrade complete
# 41        2026-02-18 10:15:00 UTC   superseded  safedns-1.3.0   1.3.0        Upgrade complete
# 42        2026-02-21 16:45:00 UTC   deployed    safedns-1.3.1   1.3.1        Upgrade complete
```

**Note:** `--history-max 10` in deployment limits available rollback revisions to last 10 releases.

### Step 2: Identify Known-Good Revision

Look for:
- Last known stable revision (typically 2-3 revisions back)
- Revision deployed before problematic changes
- Revision with "STATUS: superseded" (successfully ran before being replaced)

### Step 3: Rollback to Specific Revision

```bash
# Rollback to revision 40 (example)
helm rollback nebula-dns 40 -n nebula-dns

# With custom timeout if needed:
helm rollback nebula-dns 40 -n nebula-dns --timeout 10m
```

### Step 4: Verify Rollback

Follow "Quick Rollback" Step 2-4 above (Monitor, Verify Health, Verify Metrics).

---

## Database Migration Rollback

**WARNING:** Database migrations may not be reversible. Data migrations that delete or transform data cannot always be undone.

### Step 1: Check If Migration Was Part of Deployment

```bash
# Check migration job status
kubectl get jobs -n nebula-dns | grep migration

# View migration logs
kubectl logs -n nebula-dns job/db-migration --tail=100
```

### Step 2: Determine Reversibility

**Reversible migrations:**
- Adding columns (can be dropped)
- Adding indexes (can be dropped)
- Adding tables (can be dropped if empty)
- Creating new enum values (depends on usage)

**Non-reversible migrations:**
- Dropping columns with data
- Dropping tables with data
- Data transformations (computed column updates)
- Changing column types with data loss (VARCHAR to INT)

### Step 3: Rollback Migration (If Reversible)

```bash
# Option A: Use migration helper script
cd scripts
./rollback-migration.sh

# Script will:
# 1. Show last migration
# 2. Confirm rollback
# 3. Execute down migration
# 4. Verify schema version

# Option B: Manual rollback
kubectl exec -n nebula-dns deploy/api -- npm run migration:revert
# This runs TypeORM's down() method for last migration
```

### Step 4: Verify Database State

```bash
# Check current schema version
kubectl exec -n nebula-dns deploy/api -- \
  psql $DATABASE_URL -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"

# Verify tables exist as expected
kubectl exec -n nebula-dns deploy/api -- \
  psql $DATABASE_URL -c "\dt"

# Test application queries
kubectl exec -n nebula-dns deploy/api -- curl -s localhost:3000/health
# Should show: postgres: { status: 'healthy' }
```

### Step 5: Rollback Application After Migration Rollback

```bash
# After database rolled back, rollback application to matching version
helm rollback nebula-dns <revision> -n nebula-dns
```

### Step 6: If Migration Not Reversible

**Emergency procedure if data loss occurred:**

1. **Stop writes to affected tables:**
   ```bash
   # Scale API to 0 to prevent further writes
   kubectl scale deployment/api -n nebula-dns --replicas=0
   ```

2. **Restore from backup:**
   ```bash
   # Contact DigitalOcean support or use PITR
   # See: Backup verification runbook for restore procedures
   # Estimate data loss: Time since last backup
   ```

3. **Validate restored data:**
   ```bash
   # Check row counts match expected values
   kubectl exec -n nebula-dns deploy/api -- \
     psql $DATABASE_URL -c "SELECT COUNT(*) FROM <affected-table>;"
   ```

4. **Resume operations:**
   ```bash
   # Scale API back to normal replica count
   kubectl scale deployment/api -n nebula-dns --replicas=3
   ```

5. **Create postmortem:**
   - Document data loss extent
   - Identify why migration wasn't caught in staging
   - Add safeguards to prevent future irreversible migrations

---

## Partial Rollback (Specific Service)

If only one service has issues, rollback that service without affecting others.

**WARNING:** Use with caution — version mismatches between services can cause unexpected behavior.

### Rollback Specific Deployment

```bash
# Example: Rollback API only
kubectl rollout undo deployment/api -n nebula-dns

# Verify rollback
kubectl rollout status deployment/api -n nebula-dns
kubectl get deployment api -n nebula-dns -o yaml | grep -A 2 "image:"

# Test API health
kubectl exec -n nebula-dns deploy/api -- curl localhost:3000/health
```

### When to Use Partial Rollback

- **New service introduced** in deployment (e.g., new admin feature)
- **Service version mismatch won't break API contract** (backwards compatible)
- **Issue isolated to single service** (e.g., UI bug, not API issue)

### When NOT to Use Partial Rollback

- **Shared database schema changes** (API and services expect different schema)
- **Breaking API changes** (UI expects new API endpoints that don't exist in old API)
- **Coordinated deployment** (multiple services must be same version)

**Default recommendation:** Always rollback full Helm release to avoid version mismatches.

---

## Post-Rollback Verification

After rollback completes, verify system health:

### 1. Pod Health

```bash
# All pods should be Running with 0 restarts
kubectl get pods -n nebula-dns

# No CrashLoopBackOff or ImagePullBackOff
kubectl get pods -n nebula-dns | grep -v "Running\|Completed"
# Should return nothing
```

### 2. Health Check Endpoints

```bash
# API health (internal)
kubectl exec -n nebula-dns deploy/api -- curl -s localhost:3000/health | jq .
# Expected: { "status": "ok", "postgres": "healthy", "redis": "healthy" }

# API health (external via LoadBalancer)
curl -s https://api.nebuladns.io/health | jq .

# Policy Service health
kubectl exec -n nebula-dns deploy/policy-svc -- curl -s localhost:8080/health | jq .
```

### 3. DNS Resolution

```bash
# Get LoadBalancer IPs
kubectl get svc -n nebula-dns | grep LoadBalancer

# Test DNS resolution via DoT
drill @<dns1-loadbalancer-ip> google.com

# Test DNS resolution via DoH
curl -H "accept: application/dns-message" \
  "https://doh.nebuladns.io/dns-query?dns=AAABAAABAAAAAAAAA3d3dwdleGFtcGxlA2NvbQAAAQAB"

# Test blocked domain (should return NXDOMAIN)
drill @<dns1-loadbalancer-ip> malware-test-domain.com
```

### 4. Grafana Metrics

**SLO Dashboard** (`/d/nebula-dns-slo/`):
- DNS Availability: Should return to >99.9%
- API Availability: Should return to >99.9%
- Error budget: Consumption should stop increasing

**DNS Overview Dashboard** (`/d/dns-overview/`):
- Query success rate: >99.9%
- SERVFAIL rate: Returning to baseline
- Query latency: p95 <100ms

**API Performance Dashboard** (`/d/api-performance/`):
- Request rate: Normal QPS
- Error rate: <0.1%
- Latency: p95 <200ms

### 5. Error Log Check

```bash
# API errors (past 5 minutes since rollback)
kubectl logs -n nebula-dns deploy/api --since=5m | grep -i error

# Policy Service errors
kubectl logs -n nebula-dns deploy/policy-svc --since=5m | grep -i error

# dnsdist errors
kubectl logs -n nebula-dns deploy/dnsdist --since=5m | grep -i error

# Expected: Minimal or no errors
```

### 6. Database Connection Health

```bash
# Check PgBouncer pool (if using)
kubectl exec -n nebula-dns deploy/api -- \
  psql $DATABASE_URL -c "SHOW POOLS;"
# cl_waiting should be 0 (no queued connections)

# Check active connections
kubectl exec -n nebula-dns deploy/api -- \
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
# Should be normal baseline (not maxed out)
```

---

## Troubleshooting Rollback Issues

### Issue: Rollback Fails with Timeout

**Cause:** Pods not passing readiness probe, resource constraints

**Resolution:**
```bash
# Check pod events
kubectl describe pod -n nebula-dns <pod-name> | grep -A 10 Events

# Check pod logs
kubectl logs -n nebula-dns <pod-name> --tail=100

# Common causes:
# - Database migration incompatibility (old code, new schema)
# - Missing environment variables
# - Insufficient resources

# Force rollback with longer timeout:
helm rollback nebula-dns <revision> -n nebula-dns --timeout 20m
```

### Issue: Pods Still CrashLooping After Rollback

**Cause:** Database schema mismatch, environment configuration issue

**Resolution:**
```bash
# Check schema version
kubectl exec -n nebula-dns deploy/api -- \
  psql $DATABASE_URL -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 1;"

# If schema newer than code expects, rollback migration:
cd scripts
./rollback-migration.sh

# If environment issue, check secrets:
kubectl get secret api-secrets -n nebula-dns -o yaml
# Verify DATABASE_URL, REDIS_URL, etc. are correct

# Last resort: Rollback to much older known-good version
helm history nebula-dns -n nebula-dns
helm rollback nebula-dns <older-revision> -n nebula-dns
```

### Issue: Rollback Completed But Issues Persist

**Cause:** Issue not caused by deployment (external dependency, infrastructure)

**Resolution:**
```bash
# Check external dependencies:
# - PostgreSQL: DigitalOcean dashboard
# - Redis/Valkey: DigitalOcean dashboard
# - ClickHouse Cloud: https://clickhouse.cloud/status

# Check infrastructure:
kubectl get nodes
kubectl top nodes

# Check LoadBalancers:
doctl compute load-balancer list

# If external issue, see relevant runbook:
# - database-down.md
# - redis-down.md
# - dns-down.md
```

### Issue: Migration Rollback Fails

**Cause:** Down migration not implemented, data incompatibility

**Resolution:**
```bash
# Check migration file for down() method
# api/src/database/migrations/<timestamp>-name.ts

# If down() missing, migration is not reversible
# Options:
# 1. Write manual rollback SQL
# 2. Restore from backup (data loss)
# 3. Forward-fix (deploy new migration to undo changes)

# Manual rollback SQL example:
kubectl exec -n nebula-dns deploy/api -- \
  psql $DATABASE_URL -c "
    -- Manually reverse migration
    DROP TABLE IF EXISTS new_table;
    ALTER TABLE old_table DROP COLUMN IF EXISTS new_column;
  "
```

---

## Communication Template

### Rollback Notification (Slack/Email)

```markdown
🔄 **ROLLBACK IN PROGRESS**

**Service:** Nebula DNS Production
**Initiated by:** [Your Name]
**Time:** [Timestamp]
**Reason:** [Brief description of issue]

**Current Status:**
- Helm rollback executing
- ETA to completion: 3-5 minutes
- Users may experience brief DNS latency spike

**Next Steps:**
- Monitor rollback completion
- Verify health checks
- Post incident report

**Contact:** #engineering-ops
```

### Rollback Complete Notification

```markdown
✅ **ROLLBACK COMPLETE**

**Service:** Nebula DNS Production
**Completed by:** [Your Name]
**Time:** [Timestamp]
**Previous Revision:** [N]
**Rolled Back To:** [N-1]

**Verification:**
- ✅ All pods healthy
- ✅ Health checks passing
- ✅ DNS resolution working
- ✅ Metrics returning to baseline

**Root Cause:** [Brief description]
**Follow-up:** GitHub issue #[number] created for investigation

**Impact:**
- Error budget consumed: [X]%
- User-facing downtime: [X] minutes
- Services affected: [list]

**Status:** System stable, monitoring ongoing
```

---

## Rollback Decision Matrix

| Condition | Action | Timeframe |
|-----------|--------|-----------|
| Error rate >1% | Immediate rollback | Now |
| p95 latency >200ms for 5+ min | Immediate rollback | Now |
| CrashLoopBackOff on pods | Immediate rollback | Now |
| Health checks failing | Immediate rollback | Now |
| Error rate 0.5-1% for 10+ min | Consider rollback | Within 5 minutes |
| p95 latency 150-200ms for 10+ min | Consider rollback | Within 5 minutes |
| Error budget >10% consumed | Consider rollback | Within 10 minutes |
| Minor non-functional issues | Forward-fix | Next deployment |
| UI cosmetic bugs | Forward-fix | Next deployment |

---

## Prevention: Pre-Deployment Testing

To reduce rollback frequency:

- [ ] **Staging deployment first** — Always deploy to staging before production
- [ ] **Database migration dry-run** — Test migrations on staging database
- [ ] **Load testing** — Run k6 tests against staging after deployment
- [ ] **E2E test suite** — Verify critical user flows work in staging
- [ ] **Monitoring review** — Check staging metrics for unexpected changes
- [ ] **Canary deployment** — Consider gradual rollout for high-risk changes (future)

---

## Cross-References

- [Deployment Runbook](deployment.md) — Normal deployment procedures
- [Database Migration Guide](../DATABASE-MIGRATIONS.md) — Migration best practices
- [SLO Runbook](../slo-runbook.md) — Error budget policy and thresholds
- [DNS Down Runbook](dns-down.md) — If rollback due to DNS failures
- [Database Down Runbook](database-down.md) — If rollback due to database issues

---

**Runbook Version:** 1.0
**Last Updated:** 2026-02-21
**Next Review:** 2026-05-21 (quarterly)
