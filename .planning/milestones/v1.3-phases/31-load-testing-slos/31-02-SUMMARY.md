---
phase: 31
plan: 02
subsystem: monitoring
tags: [slo, alerting, prometheus, error-budget, ops]
dependency_graph:
  requires:
    - prometheus-operator
  provides:
    - slo-burn-rate-alerts
    - connection-pool-alerts
  affects:
    - 31-03-plan (blackbox-exporter provides metrics)
    - grafana-dashboards (SLO labels enable filtering)
tech_stack:
  added: []
  patterns:
    - multi-window-burn-rate (Google SRE Workbook pattern)
    - error-budget-alerting
key_files:
  created: []
  modified:
    - k8s/base/monitoring/prometheus-rules.yaml
decisions:
  - Multi-window burn rate pattern (1h+5m fast, 6h+30m slow) for SLO alerts
  - 99.9% availability SLO (0.1% error budget, 43.8 min/month)
  - Fast burn 14.4x rate (exhausts budget in ~2 days) → critical
  - Slow burn 6x rate (exhausts budget in ~5 days) → warning
  - Connection pool thresholds: PostgreSQL >90%, Redis >80%
  - APIHighLatency downgraded to info severity at 500ms (SLO alerts handle paging)
metrics:
  duration: 84s
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
  commits: 1
  completed_date: 2026-02-15
---

# Phase 31 Plan 02: SLO Burn Rate Alerting Rules Summary

Multi-window error budget burn rate alerting for DNS availability, API availability, API latency, and policy eval latency using Google SRE Workbook pattern.

## Overview

Added SLO-based error budget burn rate alerting rules to replace simple threshold-based alerts. The multi-window burn rate pattern provides context-aware, actionable alerts that indicate how fast error budget is being consumed, enabling proactive response before complete budget exhaustion.

**Key improvement:** Traditional threshold alerts (e.g., "p95 > 1s") cause alert fatigue and lack context. Burn rate alerts answer: "At this error rate, how long until we've exhausted our monthly error budget?" This enables prioritized response: critical alerts for fast burns (2 days to exhaustion), warnings for slow burns (5 days to exhaustion).

## Tasks Completed

### Task 1: Add SLO burn rate alerting rules to prometheus-rules.yaml

**Commit:** 71449d1

**Changes:**
- Added copyright header to prometheus-rules.yaml
- Created `nebula-dns-slo-availability` rule group with 4 alerts:
  - `DNSAvailabilitySLOFastBurn`: Critical, 1h+5m windows, 14.4x burn rate
  - `DNSAvailabilitySLOSlowBurn`: Warning, 6h+30m windows, 6x burn rate
  - `APIAvailabilitySLOFastBurn`: Critical, 1h+5m windows, 14.4x burn rate
  - `APIAvailabilitySLOSlowBurn`: Warning, 6h+30m windows, 6x burn rate
- Created `nebula-dns-slo-latency` rule group with 4 alerts:
  - `APILatencySLOFastBurn`: Critical, p95 > 200ms in 1h+5m windows
  - `APILatencySLOSlowBurn`: Warning, p95 > 200ms in 6h+30m windows
  - `PolicyEvalLatencySLOFastBurn`: Critical, p95 > 50ms in 1h+5m windows
  - `PolicyEvalLatencySLOSlowBurn`: Warning, p95 > 50ms in 6h+30m windows
- Created `nebula-dns-connection-pool` rule group with 2 alerts:
  - `PostgresConnectionPoolExhaustion`: Critical, >90% usage
  - `RedisConnectionPoolExhaustion`: Warning, >80% usage
- Updated existing `APIHighLatency` alert: threshold 1s → 500ms, severity warning → info
- Added `slo:` labels to all new rules for dashboard filtering

**Files modified:**
- k8s/base/monitoring/prometheus-rules.yaml (176 insertions, 4 deletions)

**Verification:**
- 8 burn rate rules confirmed (2 DNS + 2 API availability + 2 API latency + 2 policy latency)
- 2 connection pool alerts confirmed
- 8 SLO labels confirmed
- APIHighLatency severity changed to info, threshold 500ms
- YAML syntax validated with Python yaml.safe_load

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### Multi-Window Burn Rate Pattern

The Google SRE Workbook recommends multi-window burn rate alerts to reduce false positives while maintaining fast incident detection. Each alert requires **both** a long window AND a short window to exceed the burn rate threshold:

**Fast burn alerts (critical):**
- Long window: 1 hour
- Short window: 5 minutes
- Burn rate: 14.4x (exhausts monthly budget in ~2 days)
- Purpose: Page on-call for immediate response

**Slow burn alerts (warning):**
- Long window: 6 hours
- Short window: 30 minutes
- Burn rate: 6x (exhausts monthly budget in ~5 days)
- Purpose: Create ticket for investigation during business hours

**Why two windows?**
- Long window: Prevents alerting on transient spikes (smooths noise)
- Short window: Ensures problem is still occurring (not already resolved)
- Both must exceed threshold: Reduces false positives by 90%+ vs single-window alerts

### SLO Targets

**DNS Availability:**
- SLO: 99.9% success rate
- Error budget: 0.1% = 43.8 minutes of downtime per month
- Metric: `probe_success{job="blackbox-dns"}` from Blackbox Exporter (Plan 31-03)

**API Availability:**
- SLO: 99.9% success rate (no 5xx errors)
- Error budget: 0.1% = 43.8 minutes of errors per month
- Metric: `http_requests_total{job="api",status=~"5.."}` / total requests

**API Latency:**
- SLO: p95 < 200ms
- Metric: `http_request_duration_seconds_bucket{job="api"}`

**Policy Eval Latency:**
- SLO: p95 < 50ms (critical for DNS query path)
- Metric: `policy_evaluation_duration_seconds_bucket{job="policy-svc"}`

### Connection Pool Thresholds

**PostgreSQL:**
- Critical at >90% usage
- Prevents query queueing and timeouts
- Metric: `pg_stat_activity_count / pg_settings_max_connections`

**Redis:**
- Warning at >80% usage
- More relaxed than PostgreSQL (connection setup is faster)
- Metric: `redis_connected_clients / redis_config_maxclients`

### Existing Alert Adjustments

**APIHighLatency:**
- Previous: warning at p95 > 1s
- Updated: info at p95 > 500ms
- Rationale: SLO burn rate alerts now handle paging (critical/warning). The simple threshold alert remains useful for debugging but shouldn't page on-call. Lowered threshold to 500ms for earlier signal while reducing severity to info.

## Dependencies

**Requires (from previous phases):**
- Prometheus Operator (installed in cluster)
- API instrumentation with `http_requests_total`, `http_request_duration_seconds_bucket` metrics
- Policy service instrumentation with `policy_evaluation_duration_seconds_bucket` metrics
- PostgreSQL exporter with `pg_stat_activity_count`, `pg_settings_max_connections` metrics
- Redis exporter with `redis_connected_clients`, `redis_config_maxclients` metrics

**Provides (for future plans):**
- SLO burn rate alerts for Plan 31-03 (Blackbox Exporter will provide `probe_success` metrics)
- SLO labels (`slo: dns_availability`, etc.) for Grafana dashboard filtering
- Connection pool alerts for capacity planning

**Note:** DNS availability alerts reference `probe_success{job="blackbox-dns"}` which will be created in Plan 31-03. These alerts won't fire until the Blackbox Exporter is deployed.

## Success Criteria

✅ All criteria met:

- [x] Burn rate alert rules use multi-window pattern (long AND short window)
- [x] Fast burn: critical severity, 1h+5m windows, 14.4x burn rate
- [x] Slow burn: warning severity, 6h+30m windows, 6x burn rate
- [x] Connection pool alerts: PostgreSQL >90%, Redis >80%
- [x] All SLO rules have `slo:` label for dashboard filtering
- [x] YAML is valid and parseable
- [x] Existing rules preserved (not deleted)

**OPS-05 requirement satisfied:** Prometheus alerting rules are configured for query success rate (burn rate pattern), policy eval latency, and connection pool exhaustion.

## Next Steps

**Plan 31-03:** Deploy Blackbox Exporter for DNS availability monitoring. This will provide the `probe_success{job="blackbox-dns"}` metrics referenced by the DNS availability SLO alerts added in this plan.

**Future improvements:**
- Create Grafana dashboard filtered by `slo:` labels to visualize error budget consumption
- Add recording rules to pre-compute burn rates (reduces alert evaluation latency)
- Consider adding page-worthy alert for budget <10% remaining (final safety net)

## Self-Check: PASSED

**Files created/modified:**
- [x] k8s/base/monitoring/prometheus-rules.yaml exists and contains new rule groups

**Commits:**
- [x] Commit 71449d1 exists: feat(31-02): add SLO burn rate alerting rules to Prometheus

**Verification commands:**
```bash
# Confirm 8 burn rate rules
$ grep -c "SLOFastBurn\|SLOSlowBurn" k8s/base/monitoring/prometheus-rules.yaml
8

# Confirm connection pool alerts
$ grep "ConnectionPoolExhaustion" k8s/base/monitoring/prometheus-rules.yaml
        - alert: PostgresConnectionPoolExhaustion
        - alert: RedisConnectionPoolExhaustion

# Confirm 8 SLO labels
$ grep "slo:" k8s/base/monitoring/prometheus-rules.yaml | wc -l
8

# Confirm APIHighLatency severity changed
$ grep -A5 "alert: APIHighLatency" k8s/base/monitoring/prometheus-rules.yaml | grep "severity"
            severity: info

# Validate YAML syntax
$ python3 -c "import yaml; yaml.safe_load(open('k8s/base/monitoring/prometheus-rules.yaml'))"
# (no output = valid YAML)
```

All checks passed. Plan execution complete.
