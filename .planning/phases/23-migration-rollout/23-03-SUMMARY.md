---
phase: 23-migration-rollout
plan: 03
subsystem: infra
tags: [prometheus, grafana, alerting, rbac, monitoring, observability]

# Dependency graph
requires:
  - phase: 17-rbac-foundation-backend
    provides: Admin RBAC system with role-based access control
  - phase: 21-alerting-integrations-backend
    provides: Alerting infrastructure for sending notifications
provides:
  - Prometheus alerting rules for admin 403 rate anomalies
  - Grafana dashboard for RBAC enforcement visualization
  - Warning threshold at 10% 403 rate (5m duration)
  - Critical threshold at 30% 403 rate (2m duration)
affects:
  - Operations runbooks for RBAC rollback
  - Incident response procedures

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PromQL rate calculation with path regex filtering
    - Threshold-based alerting with duration requirements

key-files:
  created:
    - monitoring/grafana/dashboards/admin-rbac.json
  modified:
    - monitoring/prometheus/rules/nebuladns-alerts.yml

key-decisions:
  - "10% warning, 30% critical thresholds match RBAC feature flag rollout strategy"
  - "5m warning duration prevents alert fatigue from brief spikes"
  - "2m critical duration enables fast response to widespread issues"
  - "Rollback instructions included in alert description"

patterns-established:
  - "Admin endpoint monitoring pattern: filter by path=~'/admin/.*'"

# Metrics
duration: 5min
completed: 2026-02-02
---

# Phase 23 Plan 03: RBAC Monitoring Alerting Summary

**Prometheus alerts and Grafana dashboard for monitoring admin RBAC enforcement with 10%/30% thresholds**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-02
- **Completed:** 2026-02-02
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added Admin403RateWarning alert (10% threshold, 5m duration)
- Added Admin403RateCritical alert (30% threshold, 2m duration)
- Created Grafana dashboard with 403 rate visualization and threshold indicators
- Included stat panels for quick at-a-glance monitoring

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Prometheus alerts for admin 403 rate** - `f330fff` (feat)
2. **Task 2: Create Grafana dashboard for RBAC monitoring** - `d0cc60c` (feat)

## Files Created/Modified

- `monitoring/prometheus/rules/nebuladns-alerts.yml` - Added Admin403RateWarning and Admin403RateCritical alerts
- `monitoring/grafana/dashboards/admin-rbac.json` - New dashboard with 403 rate time series, request rates comparison, and stat panels

## Decisions Made

- **10%/30% thresholds:** Align with gradual RBAC rollout strategy - 10% gives early warning, 30% indicates critical misconfiguration
- **5m/2m durations:** Warning gives time for investigation without alert fatigue; critical fires faster to enable rapid response
- **Rollback instructions in description:** Alert description includes `ADMIN_RBAC_ENABLED=false` for quick remediation
- **Path regex filtering:** Using `path=~"/admin/.*"` to match all admin endpoints consistently

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RBAC monitoring infrastructure ready for production deployment
- Alerts will fire when ADMIN_RBAC_ENABLED is toggled and 403 rates exceed thresholds
- Dashboard provides visibility into RBAC enforcement impact over time

---
*Phase: 23-migration-rollout*
*Completed: 2026-02-02*
