---
phase: 31-load-testing-slos
plan: 03
subsystem: monitoring
tags: [prometheus, blackbox-exporter, synthetic-monitoring, slo, kubernetes]

# Dependency graph
requires:
  - phase: 31-02
    provides: "SLO burn rate alert rules referencing probe_success metrics"
provides:
  - "Blackbox Exporter deployment with DNS, DoH, and DoT probe modules"
  - "ServiceMonitor for synthetic DNS monitoring metrics"
  - "probe_success metrics for SLO availability tracking"
affects: [31-04, grafana, slo-dashboards]

# Tech tracking
tech-stack:
  added: [prom/blackbox-exporter:v0.25.0]
  patterns: [synthetic-monitoring, external-probes, servicemonitor]

key-files:
  created:
    - k8s/base/monitoring/blackbox-exporter.yaml
  modified:
    - k8s/base/monitoring/servicemonitors.yaml
    - k8s/base/monitoring/kustomization.yaml

key-decisions:
  - "30s probe interval balances monitoring frequency with resource usage"
  - "jobLabel: blackbox-dns enables PrometheusRule queries to reference consistent job name"
  - "HTTP prober for DoH instead of native dns prober (DoH support varies by Blackbox version)"
  - "Staging targets (dns1.staging.nebuladns.io, doh.staging.nebuladns.io) as base configuration, production via Kustomize overlays"

patterns-established:
  - "Blackbox Exporter ConfigMap pattern: dns_udp, doh_https, dot_tcp modules for comprehensive DNS protocol coverage"
  - "ServiceMonitor relabeling: instance from __param_target, probe_type for endpoint differentiation"
  - "Metric relabeling: keep only probe_success, duration_seconds, dns_lookup_time_seconds to reduce cardinality"

# Metrics
duration: 1min
completed: 2026-02-15
---

# Phase 31 Plan 03: Blackbox Exporter Deployment Summary

**Prometheus Blackbox Exporter deployed to Kubernetes with DNS/DoH/DoT probes, providing synthetic monitoring metrics for 99.9% availability SLO tracking**

## Performance

- **Duration:** 1 min 10s
- **Started:** 2026-02-15T03:35:16Z
- **Completed:** 2026-02-15T03:36:26Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Blackbox Exporter deployed with 3 probe modules targeting DNS (UDP), DoH (HTTPS), and DoT (TCP+TLS) endpoints
- ServiceMonitor configured to scrape probe_success metrics at 30s intervals with proper relabeling
- Kustomization updated to include Blackbox Exporter resource for deployment orchestration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Blackbox Exporter Kubernetes manifests** - `f40bf32` (feat)
2. **Task 2: Add Blackbox ServiceMonitor and update kustomization** - `aa0e850` (feat)

## Files Created/Modified
- `k8s/base/monitoring/blackbox-exporter.yaml` - ConfigMap with 3 probe modules (dns_udp, doh_https, dot_tcp), Deployment with 2 replicas, Service exposing port 9115
- `k8s/base/monitoring/servicemonitors.yaml` - Added blackbox-dns-probes ServiceMonitor with DNS and DoH probe endpoints
- `k8s/base/monitoring/kustomization.yaml` - Added blackbox-exporter.yaml to resources list

## Decisions Made

**1. HTTP prober for DoH instead of native DNS prober:**
- Native `transport_protocol: "doh"` requires Blackbox Exporter v0.25+, but support varies by build
- Used HTTP prober with `Accept: application/dns-message` header for broader compatibility
- Validates DoH endpoint reachability, though not full DNS resolution semantics

**2. 30s probe interval (vs 15s for application metrics):**
- External synthetic checks less critical for alerting speed than internal metrics
- Reduces load on DNS endpoints
- Provides sufficient data points for SLO burn rate calculations (1h fast window = 120 samples)

**3. Staging targets in base configuration:**
- `dns1.staging.nebuladns.io` and `doh.staging.nebuladns.io` as defaults
- Production targets will be overlaid via Kustomize patches per environment
- Prevents accidental production probing from development clusters

**4. jobLabel: blackbox-dns for consistent PrometheusRule queries:**
- Enables alert rules to reference `probe_success{job="blackbox-dns"}` consistently
- Avoids reliance on ServiceMonitor name changes affecting queries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Blackbox Exporter ready for deployment via `kubectl apply -k k8s/base/monitoring`
- probe_success metrics available for Plan 31-04 Grafana SLO dashboards
- Production targets need Kustomize overlay with actual DNS/DoH endpoints before production deployment
- Plan 31-02 burn rate alerts will activate once metrics begin flowing

## Self-Check: PASSED

All files and commits verified:
- Created: k8s/base/monitoring/blackbox-exporter.yaml ✓
- Modified: k8s/base/monitoring/servicemonitors.yaml ✓
- Modified: k8s/base/monitoring/kustomization.yaml ✓
- Commit f40bf32 (Task 1) ✓
- Commit aa0e850 (Task 2) ✓

---
*Phase: 31-load-testing-slos*
*Completed: 2026-02-15*
