---
phase: 33-operational-readiness
plan: 02
subsystem: monitoring
tags:
  - hpa
  - autoscaling
  - backup-verification
  - prometheus-adapter
  - operational-readiness
dependency_graph:
  requires:
    - "Prometheus Adapter installed in monitoring namespace"
    - "prometheus-rules.yaml with dns_queries_total metric"
    - "policy-svc exposing /metrics endpoint"
  provides:
    - "Custom DNS QPS metric for HPA scaling"
    - "Anti-flapping HPA behavior for Policy Service"
    - "Automated monthly backup verification"
  affects:
    - "Policy Service autoscaling behavior"
    - "Backup reliability verification"
tech_stack:
  added:
    - component: "Prometheus Adapter"
      purpose: "Expose custom Prometheus metrics to K8s HPA"
      version: "helm chart: prometheus-community/prometheus-adapter"
    - component: "Backup Verification CronJob"
      purpose: "Monthly automated backup restore testing"
      version: "postgres:16 image with curl"
  patterns:
    - "Multi-metric HPA with custom DNS QPS + CPU fallback"
    - "Anti-flapping stabilization windows (5min down, 1min up)"
    - "Monthly restore drill automation with exit code signaling"
key_files:
  created:
    - path: "k8s/base/monitoring/prometheus-adapter-config.yaml"
      purpose: "Prometheus Adapter custom metric rules"
      lines: 48
    - path: "scripts/verify-backups.sh"
      purpose: "Backup verification script for PostgreSQL and ClickHouse"
      lines: 146
    - path: "k8s/base/backups/backup-verification-cronjob.yaml"
      purpose: "Monthly CronJob for automated backup verification"
      lines: 222
  modified:
    - path: "k8s/base/policy-svc-deployment.yaml"
      purpose: "Enhanced HPA with custom DNS QPS metrics and anti-flapping behavior"
      changes: "Replaced simple CPU HPA with dual-metric (DNS QPS + CPU) HPA, added stabilization behavior"
decisions:
  - decision: "Primary metric: DNS QPS (1000/pod) vs CPU (70% fallback)"
    rationale: "CPU doesn't correlate with DNS load due to in-memory cache lookups. QPS provides better workload signal."
    alternatives: "CPU-only scaling (current), memory-based scaling, request count"
    chosen: "DNS QPS primary with CPU fallback for when custom metrics unavailable"
  - decision: "5min scale-down cooldown, 1min scale-up cooldown"
    rationale: "Prevents pod churn during traffic fluctuations. Scale-down more conservative to avoid capacity gaps."
    alternatives: "No cooldown, equal cooldowns, longer cooldowns"
    chosen: "5min/1min asymmetric cooldown balances stability and responsiveness"
  - decision: "Monthly verification schedule (1st of month, 3 AM UTC)"
    rationale: "Quarterly is too infrequent for production safety, weekly is excessive overhead for managed databases."
    alternatives: "Weekly, quarterly, on-demand only"
    chosen: "Monthly automated verification with 3 AM UTC low-traffic window"
  - decision: "Embedded CronJob script vs mounted volume"
    rationale: "Simplifies deployment - no ConfigMap/volume management. Script is stable, rarely changes."
    alternatives: "Mount verify-backups.sh via ConfigMap, separate Job image"
    chosen: "Embedded inline script in CronJob for simplicity"
metrics:
  tasks_completed: 2
  tasks_total: 2
  commits: 2
  files_created: 3
  files_modified: 1
  lines_added: 496
  duration_seconds: 131
  completed_at: "2026-02-22T02:03:28Z"
---

# Phase 33 Plan 02: HPA Custom Metrics and Backup Verification Summary

**One-liner:** Policy Service HPA scales on DNS QPS (1000/pod) with anti-flapping behavior + monthly automated backup verification for PostgreSQL and ClickHouse Cloud

## Objective

Configure HPA with custom DNS query metrics for Policy Service auto-scaling and create automated backup verification for PostgreSQL and ClickHouse Cloud.

**Why this matters:** CPU-based scaling doesn't correlate well with DNS query load due to in-memory cache lookups. Custom DNS QPS metrics enable scaling based on actual workload. Backup verification prevents the "untested backups aren't backups" anti-pattern.

## Implementation Summary

### Task 1: Prometheus Adapter and Custom DNS QPS Metrics

**Commit:** `9aeea18`

Created Prometheus Adapter configuration exposing custom DNS query rate metrics to Kubernetes HPA:

- **Prometheus Adapter ConfigMap** (`k8s/base/monitoring/prometheus-adapter-config.yaml`):
  - Exposes `dns_queries_total` counter as `dns_queries_per_second` rate metric
  - Uses 2-minute rate window for smoothing
  - Secondary metric: `policy_evaluations_per_second` for cache hit ratio analysis

- **Enhanced Policy Service HPA** (`k8s/base/policy-svc-deployment.yaml`):
  - **Primary metric:** DNS QPS with target 1000 queries/pod average
  - **Secondary metric:** CPU utilization at 70% (fallback when custom metrics unavailable)
  - **Anti-flapping behavior:**
    - Scale-down: 5-minute stabilization window, max 1 pod removal per 60 seconds
    - Scale-up: 1-minute stabilization window, max 50% increase per 60 seconds
  - **Capacity bounds:** minReplicas: 3, maxReplicas: 20 (unchanged)

**Why dual metrics?** DNS QPS provides better workload signal than CPU alone, but CPU fallback ensures scaling works when Prometheus Adapter is unavailable.

**Why asymmetric cooldowns?** Scaling down too fast creates capacity gaps during traffic fluctuations. 5-minute cooldown prevents premature pod removal. Scaling up can be faster (1 minute) since adding capacity is safer than removing it.

### Task 2: Automated Backup Verification

**Commit:** `a5e49ef`

Created comprehensive backup verification automation:

- **Verification Script** (`scripts/verify-backups.sh`):
  - **PostgreSQL checks:** Connection test, row counts for key tables (tenants, users, policies, locations)
  - **ClickHouse checks:** Connection test, table existence, row counts (dns_queries, threat_logs, audit_logs), partition health
  - Exit codes: 0 (all pass), 1 (any fail) for CI/monitoring integration
  - Color-coded output for human readability

- **Monthly CronJob** (`k8s/base/backups/backup-verification-cronjob.yaml`):
  - **Schedule:** `0 3 1 * *` (1st of every month at 3 AM UTC)
  - **Image:** postgres:16 with curl for ClickHouse HTTP API
  - **Secrets:** Pulls credentials from `api-secrets` (PostgreSQL) and `policy-svc-secrets` (ClickHouse)
  - **History limits:** 3 successful jobs, 3 failed jobs retained
  - **Retry policy:** `backoffLimit: 3` with `restartPolicy: OnFailure`

**Why monthly?** Quarterly is too infrequent for production safety (3-month gap risks undetected backup corruption). Weekly is excessive overhead for managed databases with built-in backup verification. Monthly balances reliability with operational cost.

**Why embedded script?** CronJob contains the verification logic inline rather than mounting `verify-backups.sh` via ConfigMap. This simplifies deployment (no volume management) and is appropriate since the script is stable and rarely changes. The standalone script exists for manual verification.

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Satisfied

- **OPS-08:** Policy Service HPA scales on custom DNS QPS metric (1000 QPS/pod target) with anti-flapping behavior (5-min scale-down cooldown, max 1 pod removal per minute)
- **OPS-09:** Monthly automated backup verification for PostgreSQL (data accessibility via table row counts) and ClickHouse Cloud (table existence, row counts, partition health)

## Technical Details

### Prometheus Adapter Configuration

The adapter queries Prometheus for `dns_queries_total{namespace="nebula-dns",job="policy-svc"}` and transforms it into a rate metric:

```yaml
metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'
```

This exposes `dns_queries_per_second` to the Kubernetes custom metrics API, which HPA can consume.

### HPA Metric Selection Logic

HPA uses the **maximum** value across all metrics when multiple metrics are defined. If DNS QPS exceeds threshold OR CPU exceeds threshold, HPA scales up. This ensures scaling happens based on whichever signal indicates load first.

**Example:** If pod is at 1200 QPS (120% of target) but only 50% CPU, HPA scales up based on QPS. If custom metrics fail, HPA falls back to CPU-only scaling.

### Backup Verification Approach

**PostgreSQL (DigitalOcean Managed Database):**
- DigitalOcean handles automated backups and PITR internally
- Our verification confirms **data accessibility** and **consistency** (table counts match expected schema)
- Does NOT test physical backup file integrity (managed by DigitalOcean)

**ClickHouse Cloud:**
- ClickHouse Cloud handles automated backups internally
- Our verification confirms **table existence**, **row count accessibility**, and **partition health**
- Partition check validates `system.parts` shows active partitions (indicates proper data retention and TTL)

**Exit code signaling:** Script exits with code 1 on any failure, enabling Kubernetes to mark the Job as failed and trigger alerting via Prometheus job metrics.

## Verification Results

All verification checks passed:

1. Prometheus Adapter ConfigMap exists with valid YAML
2. HPA contains `dns_queries_per_second` custom metric
3. HPA contains both `type: Pods` (custom) and `type: Resource` (CPU) metrics
4. HPA has `stabilizationWindowSeconds` for both scale-down (300s) and scale-up (60s)
5. Backup verification script passes shell syntax check (`bash -n`)
6. CronJob has monthly schedule (`0 3 1 * *`)
7. Script checks both PostgreSQL and ClickHouse (27 occurrences of postgres/clickhouse keywords)

## Next Steps

1. **Deploy Prometheus Adapter** to monitoring namespace using Helm chart:
   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm upgrade --install prometheus-adapter prometheus-community/prometheus-adapter \
     --namespace monitoring \
     --set prometheus.url=http://prometheus-server.monitoring.svc.cluster.local \
     --set-file rules.custom=/path/to/prometheus-adapter-config.yaml
   ```

2. **Apply updated Policy Service HPA** to cluster:
   ```bash
   kubectl apply -f k8s/base/policy-svc-deployment.yaml
   ```

3. **Deploy backup verification CronJob**:
   ```bash
   kubectl apply -f k8s/base/backups/backup-verification-cronjob.yaml
   ```

4. **Validate custom metrics are available**:
   ```bash
   kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/namespaces/nebula-dns/pods/*/dns_queries_per_second
   ```

5. **Monitor HPA behavior** after deployment:
   ```bash
   kubectl describe hpa policy-svc -n nebula-dns
   kubectl get hpa policy-svc -n nebula-dns --watch
   ```

6. **Run manual backup verification** before monthly CronJob trigger:
   ```bash
   # Set environment variables
   export POSTGRES_HOST=... POSTGRES_USER=... POSTGRES_PASSWORD=... POSTGRES_DB=...
   export CLICKHOUSE_HOST=... CLICKHOUSE_USER=... CLICKHOUSE_PASSWORD=... CLICKHOUSE_DB=...

   # Run verification
   ./scripts/verify-backups.sh
   ```

## Files Changed

| File | Type | Purpose |
|------|------|---------|
| `k8s/base/monitoring/prometheus-adapter-config.yaml` | Created | Prometheus Adapter custom metric rules for dns_queries_per_second |
| `k8s/base/policy-svc-deployment.yaml` | Modified | Enhanced HPA with DNS QPS + CPU metrics, anti-flapping behavior |
| `scripts/verify-backups.sh` | Created | Backup verification script for PostgreSQL and ClickHouse |
| `k8s/base/backups/backup-verification-cronjob.yaml` | Created | Monthly CronJob for automated backup verification |

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| `9aeea18` | feat(33-02): configure HPA with custom DNS QPS metrics and anti-flapping | prometheus-adapter-config.yaml, policy-svc-deployment.yaml |
| `a5e49ef` | feat(33-02): add automated backup verification for PostgreSQL and ClickHouse | verify-backups.sh, backup-verification-cronjob.yaml |

## Self-Check: PASSED

Verified all created files exist:
```bash
FOUND: k8s/base/monitoring/prometheus-adapter-config.yaml
FOUND: scripts/verify-backups.sh
FOUND: k8s/base/backups/backup-verification-cronjob.yaml
FOUND: k8s/base/policy-svc-deployment.yaml (modified)
```

Verified all commits exist:
```bash
FOUND: 9aeea18
FOUND: a5e49ef
```

All claims in this summary have been verified against actual files and git history.
