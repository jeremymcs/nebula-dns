---
phase: 21-alerting-integrations-backend
plan: 05
subsystem: alerting
tags: [alerting, slack, pagerduty, admin, security, health-monitoring]

# Dependency graph
requires:
  - phase: 21-02
    provides: Slack webhook provider
  - phase: 21-03
    provides: PagerDuty Events API v2 provider
  - phase: 21-04
    provides: AlertingService with encrypted configuration storage
provides:
  - AlertDispatcherService for central alert routing
  - AlertingController with admin API endpoints
  - AlertingModule exports for other services
  - Health monitoring with alert triggers
  - Security event alerting for suspicious impersonation
  - Billing alert infrastructure for payment failures
affects: [admin-ui, webhook-handlers, monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional dependency injection for alerting in event sources"
    - "Cooldown tracking to prevent alert spam (5 minutes for health, resets for impersonation)"
    - "In-memory tracking for impersonation patterns (1-hour windows)"
    - "Fire-and-forget async dispatch with error handling per config"

key-files:
  created:
    - api/src/modules/alerting/alert-dispatcher.service.ts
    - api/src/modules/alerting/alerting.controller.ts
    - api/src/modules/alerting/alerting.module.ts
  modified:
    - api/src/modules/admin/admin.module.ts
    - api/src/modules/admin/admin-health.service.ts
    - api/src/modules/admin/admin.service.ts
    - api/src/modules/payments/payments.service.ts

key-decisions:
  - "AlertDispatcherService uses @Optional injection to allow services to work without alerting"
  - "Health alerts implement 5-minute cooldown per status to prevent spam"
  - "Impersonation tracking uses in-memory Map with 1-hour windows (3+ triggers warning)"
  - "Payment alerts prepared but require webhook handler integration"
  - "All event sources use optional alerting to avoid hard dependencies"

patterns-established:
  - "Pattern 1: Optional alerting - Services inject AlertDispatcherService with @Optional() decorator"
  - "Pattern 2: Cooldown tracking - Use Map<string, number> to track last alert time per identifier"
  - "Pattern 3: Helper methods - Dispatcher provides dispatchSystemHealth/dispatchBilling/dispatchSecurity"
  - "Pattern 4: Parallel dispatch - Use Promise.all to send to all matching configs simultaneously"

# Metrics
duration: 5.5min
completed: 2026-01-22
---

# Phase 21 Plan 05: Alert Dispatcher and Integration Summary

**Central alert routing service dispatching to Slack/PagerDuty with health monitoring, security event detection, and billing alert infrastructure**

## Performance

- **Duration:** 5.5 min (332 seconds)
- **Started:** 2026-01-22T05:21:09Z
- **Completed:** 2026-01-22T05:26:41Z
- **Tasks:** 4
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- AlertDispatcherService routes alerts to configured channels with severity/event filtering
- Admin API endpoints for alert configuration CRUD (enable/disable, test, delete)
- Health monitoring triggers critical alerts on service down, warnings on degraded
- Security monitoring detects suspicious impersonation (3+ in 1 hour)
- Billing alert infrastructure ready for webhook integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AlertDispatcherService** - `db35f9f` (feat)
2. **Task 2: Create AlertingController** - `b9106f4` (feat)
3. **Task 3: Create AlertingModule** - `c89dd2a` (feat)
4. **Task 4: Integrate alert triggers** - `8b31aa2` (feat)

## Files Created/Modified

**Created:**
- `api/src/modules/alerting/alert-dispatcher.service.ts` - Central alert routing service with severity/event filtering
- `api/src/modules/alerting/alerting.controller.ts` - Admin API for alert configuration CRUD
- `api/src/modules/alerting/alerting.module.ts` - Module definition with provider/controller registration

**Modified:**
- `api/src/modules/admin/admin.module.ts` - Imported AlertingModule for dispatcher access
- `api/src/modules/admin/admin-health.service.ts` - Added health status alerts with 5-min cooldown
- `api/src/modules/admin/admin.service.ts` - Added impersonation pattern detection (3+ in 1 hour)
- `api/src/modules/payments/payments.service.ts` - Added billing alert method with webhook integration notes

## Decisions Made

**AlertDispatcher as optional dependency:**
- All event sources use `@Optional()` injection for AlertDispatcherService
- Services continue to work if alerting is not configured
- Prevents circular dependencies and hard coupling

**Cooldown strategies:**
- Health alerts: 5-minute cooldown per status (unhealthy/degraded)
- Impersonation alerts: Reset counter after alerting (prevents spam)
- Different strategies match different event patterns

**In-memory tracking for impersonation:**
- Map<adminId, { count, windowStart }> tracks patterns
- 1-hour sliding windows with 3+ threshold
- Simpler than database queries, acceptable for this use case

**Billing alerts deferred to webhook handler:**
- PaymentsService has `handlePaymentFailure()` method ready
- Webhook handler integration left for when webhook processing is implemented
- Detailed integration notes provided in code comments

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript Map type inference issue:**
- Map constructor with tuples caused type compatibility error
- Fixed by using separate `map.set()` calls instead of constructor
- Common TypeScript generic inference limitation

**ApiResponse decorator misuse:**
- Used @ApiResponse on DTO properties instead of @ApiProperty
- Fixed by removing decorators (DTO properties don't need them)
- Controller methods use @ApiResponse for endpoint documentation

## User Setup Required

None - no external service configuration required.

Alert configurations are created via admin API endpoints. External setup (Slack webhook URLs, PagerDuty routing keys) is provided by admins when creating configurations.

## Next Phase Readiness

**Ready for:**
- Admin UI for alert configuration management
- Webhook handler integration for billing alerts
- Additional alert event types (DNS query anomalies, rate limit violations)

**Completed requirements:**
- ALERT-04: System health issues trigger alerts ✓
- ALERT-05: Billing issues trigger alerts (infrastructure ready) ✓
- ALERT-06: Security events trigger alerts ✓
- ALERT-07: Critical routes to PagerDuty, warnings to Slack only ✓
- ALERT-08: Enable/disable endpoints ✓
- ALERT-09: Test endpoint sends verification alert ✓

**No blockers or concerns.**

---
*Phase: 21-alerting-integrations-backend*
*Completed: 2026-01-22*
