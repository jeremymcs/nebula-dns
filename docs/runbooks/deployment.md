# Runbook: Production Deployment Procedure

// Nebula DNS - Production Deployment Procedure
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Version:** 1.0
**Last Updated:** 2026-02-21
**Owner:** DevOps/SRE Team
**Purpose:** Document safe production deployment procedures for Nebula DNS platform

## Overview

This runbook documents the standard deployment process for Nebula DNS production environment. All deployments use Helm with rolling update strategy and include pre-flight verification, automated deployment via GitHub Actions, and post-deployment validation.

**Deployment Strategy:** Rolling update (maxSurge: 1, maxUnavailable: 0)
- **Why:** Cost-efficient, no 2x infrastructure requirement
- **Tradeoff:** Brief DNS latency spike during cache warm-up (~30s) is acceptable
- **Alternative:** Blue-green via Argo Rollouts if SLO violations occur during deployments (future consideration)

---

## Pre-Deployment Checklist

Complete all checks before initiating production deployment:

- [ ] **CI/CD pipeline passed** — All tests green in GitHub Actions (unit, integration, E2E)
- [ ] **Docker images pushed to DOCR** — Verify images exist for all services (api, ui, admin-ui, policy-svc, dnsdist, unbound)
- [ ] **Staging deployment verified** — Changes tested in staging environment, no issues
- [ ] **Database migrations tested** — If migrations included, tested on staging database first
- [ ] **Changelog reviewed** — Understand what's changing (features, fixes, infrastructure)
- [ ] **Monitoring dashboards open** — Grafana SLO dashboard, DNS Overview, API Performance ready
- [ ] **Error budget healthy** — >50% error budget remaining (check SLO dashboard)
- [ ] **No ongoing incidents** — No active alerts or degraded services
- [ ] **Communication sent** — Stakeholders notified of deployment window (if high-risk change)
- [ ] **Rollback plan ready** — Reviewed [rollback.md](rollback.md) procedures

---

## Deployment Procedure

### Standard Deployment (GitHub Actions - Recommended)

**Trigger:** Automatic on push to `main` branch (staging) or manual approval (production)

1. **Push changes to main branch:**
   ```bash
   git push origin main
   ```

2. **Monitor GitHub Actions workflow:**
   - Navigate to: https://github.com/nebuladns/nebula-dns/actions
   - Watch `.github/workflows/deploy.yml` progress
   - Steps: Tests → Build images → Deploy to staging → Manual approval → Deploy to production

3. **Approve production deployment:**
   - GitHub Actions will pause at "Deploy to Production" step
   - Review staging deployment results
   - Click "Review deployments" → "Approve" in GitHub Actions UI

4. **Monitor deployment progress:**
   - GitHub Actions logs show Helm upgrade output
   - Watch for: "Release nebula-dns upgraded successfully"
   - Deployment timeout: 15 minutes (atomic rollback if timeout)

5. **Proceed to Post-Deployment Verification** (see section below)

---

### Manual Deployment (Fallback)

**Use when:** GitHub Actions unavailable, emergency deployment, testing infrastructure changes

**Prerequisites:**
- kubectl configured for production cluster
- Helm v3.14+ installed
- Access to DOCR registry
- Production values file: `helm/safedns/values-production.yaml`

**Steps:**

1. **Authenticate to DigitalOcean Kubernetes:**
   ```bash
   doctl auth init
   doctl kubernetes cluster kubeconfig save <cluster-id>
   kubectl config use-context do-<region>-<cluster-name>
   ```

2. **Verify current cluster context:**
   ```bash
   kubectl config current-context
   # Should show production cluster
   kubectl get nodes
   # Verify node count and status
   ```

3. **Pull latest Helm chart:**
   ```bash
   cd helm/safedns
   git pull origin main
   ```

4. **Dry-run deployment to validate:**
   ```bash
   helm upgrade nebula-dns . \
     -n nebula-dns \
     -f values-production.yaml \
     --dry-run --debug
   # Review output for errors, verify expected changes
   ```

5. **Execute deployment with atomic flag:**
   ```bash
   helm upgrade nebula-dns . \
     -n nebula-dns \
     -f values-production.yaml \
     --atomic \
     --timeout 15m \
     --history-max 10
   ```

   **Flags explained:**
   - `--atomic`: Automatically rolls back if deployment fails
   - `--timeout 15m`: Max time to wait for all pods to be ready (production has 2-10 replicas)
   - `--history-max 10`: Keep last 10 releases for rollback (2-4 weeks at typical deployment frequency)

6. **Monitor deployment in separate terminal:**
   ```bash
   # API deployment
   kubectl rollout status deployment/api -n nebula-dns --timeout=300s

   # Policy Service deployment
   kubectl rollout status deployment/policy-svc -n nebula-dns --timeout=300s

   # Unbound StatefulSet
   kubectl rollout status statefulset/unbound -n nebula-dns --timeout=300s

   # dnsdist deployment
   kubectl rollout status deployment/dnsdist -n nebula-dns --timeout=300s

   # UI deployment
   kubectl rollout status deployment/ui -n nebula-dns --timeout=300s

   # Admin UI deployment
   kubectl rollout status deployment/admin-ui -n nebula-dns --timeout=300s
   ```

7. **If deployment fails (timeout or health check failure):**
   - Helm will automatically rollback with `--atomic` flag
   - Check logs: `kubectl logs -n nebula-dns deploy/<service> --tail=100`
   - See [rollback.md](rollback.md) for manual rollback procedures

8. **Proceed to Post-Deployment Verification** (see section below)

---

## Post-Deployment Verification

**Target:** Complete verification within 5 minutes of deployment

### 1. Check Pod Status

```bash
# All pods should be Running with recent age
kubectl get pods -n nebula-dns

# Expected output:
# api-xxxxxxxxxx-xxxxx         1/1   Running   0   2m
# policy-svc-xxxxxxxxxx-xxxxx  1/1   Running   0   2m
# dnsdist-xxxxxxxxxx-xxxxx     1/1   Running   0   2m
# unbound-0                    1/1   Running   0   2m
# ui-xxxxxxxxxx-xxxxx          1/1   Running   0   2m
# admin-ui-xxxxxxxxxx-xxxxx    1/1   Running   0   2m
```

### 2. Health Check Endpoints

```bash
# API health
kubectl exec -n nebula-dns deploy/api -- curl -s localhost:3000/health | jq .
# Expected: { "status": "ok", "postgres": "healthy", "redis": "healthy" }

# Policy Service health
kubectl exec -n nebula-dns deploy/policy-svc -- curl -s localhost:8080/health | jq .
# Expected: { "status": "ok", "redis": "healthy" }

# External API health (via LoadBalancer)
curl -s https://api.nebuladns.io/health | jq .

# UI health
curl -s https://app.nebuladns.io/api/config | jq .
```

### 3. DNS Resolution Test

```bash
# Get LoadBalancer IPs
kubectl get svc -n nebula-dns | grep LoadBalancer

# Test DNS resolution
drill @<dns1-loadbalancer-ip> google.com
drill @<dns2-loadbalancer-ip> cloudflare.com

# Test blocked domain (should return NXDOMAIN)
drill @<dns1-loadbalancer-ip> malware-test-domain.com

# Test DoH endpoint
curl -H "accept: application/dns-message" \
  "https://doh.nebuladns.io/dns-query?dns=AAABAAABAAAAAAAAA3d3dwdleGFtcGxlA2NvbQAAAQAB"
```

### 4. Check Grafana Dashboards

**SLO Dashboard** (`/d/nebula-dns-slo/`):
- DNS Availability: Should remain >99.9%
- API Availability: Should remain >99.9%
- Error budget: Should not spike significantly

**DNS Overview Dashboard** (`/d/dns-overview/`):
- Query success rate: >99.9%
- SERVFAIL rate: No spike
- Query latency: p95 <100ms

**API Performance Dashboard** (`/d/api-performance/`):
- Request rate: Baseline QPS
- Error rate: <0.1%
- Latency: p95 <200ms

### 5. Check Database Migrations

If deployment includes database migrations:

```bash
# Check migration job status
kubectl get jobs -n nebula-dns | grep migration

# View migration logs
kubectl logs -n nebula-dns job/db-migration --tail=50

# Expected: "All migrations completed successfully"

# Verify database schema version
kubectl exec -n nebula-dns deploy/api -- \
  psql $DATABASE_URL -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"
```

### 6. Check for Errors in Logs

```bash
# API errors (past 5 minutes)
kubectl logs -n nebula-dns deploy/api --since=5m | grep -i error

# Policy Service errors
kubectl logs -n nebula-dns deploy/policy-svc --since=5m | grep -i error

# dnsdist errors
kubectl logs -n nebula-dns deploy/dnsdist --since=5m | grep -i error

# Unbound errors
kubectl logs -n nebula-dns statefulset/unbound --since=5m | grep -i error
```

### 7. Verify Helm Release

```bash
# Check release status
helm list -n nebula-dns

# Expected:
# NAME          REVISION  STATUS    CHART          APP VERSION
# nebula-dns    42        deployed  safedns-1.3.0  1.3.0

# View release history
helm history nebula-dns -n nebula-dns --max 5
```

---

## Post-Deployment Monitoring

**Monitor for 15 minutes after deployment before considering deployment complete.**

### Metrics to Watch

1. **Error Rate:**
   - DNS probe failures: Should stay at 0%
   - API 5xx errors: Should stay <0.1%
   - Policy Service eval errors: Should stay at 0%

2. **Latency:**
   - DNS query latency: p95 <100ms (may spike to 150ms during cache warm-up, should recover in 30s)
   - API latency: p95 <200ms
   - Policy eval latency: p95 <50ms

3. **Pod Health:**
   - Restart count: Should remain at 0
   - Memory usage: Should stabilize after 5 minutes
   - CPU usage: Should return to baseline after cache warm-up

4. **Database Connections:**
   - PgBouncer pool usage: Should be <70%
   - Active connections: Should match pre-deployment baseline

5. **Cache Hit Rates:**
   - Redis cache hit rate: Should return to >90% within 5 minutes
   - Unbound cache hit rate: May drop temporarily, should recover to >80% within 10 minutes

### When to Rollback

Initiate rollback immediately if:

- Error rate exceeds 1% after deployment
- p95 latency >200ms sustained for 5+ minutes
- Health check endpoints returning 503
- CrashLoopBackOff on new pods
- Database connection pool exhausted (>90%)
- DNS probe success rate <99%

See [rollback.md](rollback.md) for rollback procedures.

---

## Deployment Strategies Comparison

| Strategy | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **Rolling Update** (current) | Cost-efficient, no 2x infra, built into K8s | Brief latency spike during cache warm-up (~30s) | Default for most deployments |
| **Blue-Green** | Zero downtime, instant rollback, safe testing | 2x infrastructure cost, complex DNS switching | High-risk changes, major version upgrades |
| **Canary** | Gradual rollout, early issue detection, low risk | Complex routing rules, longer deployment time | New features with unknown impact |

**Current approach:** Rolling update with `maxSurge: 1, maxUnavailable: 0`
- Ensures at least current replica count always available
- Adds 1 new pod before removing old pod
- DNS latency spike during cache warm-up is acceptable per SLO error budget

**Future consideration:** If SLO violations occur during deployments, implement blue-green via Argo Rollouts.

---

## Troubleshooting Common Deployment Issues

### Issue: Pod Stuck in "Pending" State

**Cause:** Insufficient cluster resources (CPU/memory)

**Resolution:**
```bash
# Check pod events
kubectl describe pod -n nebula-dns <pod-name> | grep -A 10 Events

# Check node resources
kubectl top nodes

# If resources exhausted, scale cluster:
doctl kubernetes cluster node-pool update <cluster-id> <pool-id> --count 5

# Or reduce requested resources in values-production.yaml
```

### Issue: Pod in "CrashLoopBackOff"

**Cause:** Application startup error, misconfiguration, missing dependency

**Resolution:**
```bash
# View pod logs
kubectl logs -n nebula-dns <pod-name> --previous

# Common causes:
# - Database connection failure → Check DATABASE_URL secret
# - Redis connection failure → Check REDIS_URL secret
# - ClickHouse connection failure → Check CLICKHOUSE_URL secret
# - Missing environment variable → Check deployment manifest

# Rollback if persistent:
helm rollback nebula-dns -n nebula-dns
```

### Issue: "ImagePullBackOff"

**Cause:** Image doesn't exist in DOCR, credentials expired

**Resolution:**
```bash
# Verify image exists
doctl registry repository list-tags <service-name>

# Refresh DOCR credentials
doctl registry kubernetes-manifest | kubectl apply -f -

# Delete pod to retry pull
kubectl delete pod -n nebula-dns <pod-name>
```

### Issue: Deployment Timeout

**Cause:** Readiness probe failing, slow startup, resource contention

**Resolution:**
```bash
# Check readiness probe status
kubectl describe pod -n nebula-dns <pod-name> | grep -A 5 Readiness

# If slow startup (e.g., cache warm-up), increase timeout:
# helm/safedns/values-production.yaml
# readinessProbe.initialDelaySeconds: 30 → 60

# Redeploy with increased timeout
```

### Issue: Database Migration Failed

**Cause:** SQL syntax error, migration timeout, schema conflict

**Resolution:**
```bash
# View migration logs
kubectl logs -n nebula-dns job/db-migration --tail=100

# Rollback migration
cd scripts
./rollback-migration.sh

# Fix migration SQL, redeploy
```

---

## Emergency Deployment Procedures

### Fast-Track Deployment (Security Patch)

For critical security patches that need immediate deployment:

1. **Skip staging verification** (use with caution)
2. **Deploy directly to production:**
   ```bash
   helm upgrade nebula-dns ./helm/safedns \
     -n nebula-dns \
     -f values-production.yaml \
     --atomic --timeout 10m
   ```
3. **Monitor closely for 30 minutes**
4. **Notify team in Slack immediately**

### Hotfix Deployment (Bug Fix)

For urgent bug fixes that can't wait for normal deployment window:

1. **Create hotfix branch:**
   ```bash
   git checkout -b hotfix/critical-bug-description main
   ```
2. **Make minimal changes (bug fix only)**
3. **Test locally if possible**
4. **Push and deploy via GitHub Actions**
5. **Create pull request for review after deployment**

---

## Post-Deployment Tasks

After successful deployment and monitoring:

- [ ] **Update deployment log** — Document what was deployed, by whom, when
- [ ] **Close related GitHub issues** — Mark issues as deployed to production
- [ ] **Update CHANGELOG.md** — Document user-facing changes
- [ ] **Notify stakeholders** — Send deployment summary to team/users
- [ ] **Monitor SLO dashboard** — Check error budget impact over next 24 hours
- [ ] **Review metrics** — Look for any unexpected metric changes
- [ ] **Create follow-up issues** — If minor issues found, create issues for next sprint

---

## Deployment Checklist Template

Copy this template for each deployment:

```markdown
## Deployment: [Date] - [Description]

**Deployed by:** [Name]
**Git commit:** [SHA]
**Helm chart version:** [Version]

### Pre-Deployment
- [ ] CI/CD pipeline passed
- [ ] Staging verified
- [ ] Migrations tested
- [ ] Error budget >50%
- [ ] Dashboards open

### Deployment
- [ ] Helm upgrade executed
- [ ] All pods Running
- [ ] Health checks passed
- [ ] DNS resolution working
- [ ] Migrations completed

### Post-Deployment
- [ ] Monitored for 15 minutes
- [ ] No error rate increase
- [ ] Latency within SLO
- [ ] No alerts fired
- [ ] Stakeholders notified

### Issues
[Any issues encountered and how resolved]

### Rollback
[If rollback needed, document reason and procedure]
```

---

## Cross-References

- [Rollback Runbook](rollback.md) — How to rollback failed deployments
- [Database Migration Guide](../DATABASE-MIGRATIONS.md) — Database migration procedures
- [SLO Runbook](../slo-runbook.md) — Error budget policy and thresholds
- [CI/CD Pipeline Documentation](../ci-cd-pipeline.md) — GitHub Actions workflow details

---

**Runbook Version:** 1.0
**Last Updated:** 2026-02-21
**Next Review:** 2026-05-21 (quarterly)
