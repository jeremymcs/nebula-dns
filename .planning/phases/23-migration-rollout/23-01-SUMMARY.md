---
phase: 23-migration-rollout
plan: 01
subsystem: auth
tags: [rbac, feature-flags, shadow-mode, audit-logging, nestjs]

# Dependency graph
requires:
  - phase: 17-rbac-foundation-backend
    provides: AdminRolesGuard, AdminRole enum, role-based decorators
  - phase: 19-admin-user-management-backend
    provides: Admin entity with roles, audit logging patterns
provides:
  - ADMIN_RBAC_ENABLED feature flag for controlled RBAC enforcement
  - ADMIN_RBAC_SHADOW_MODE feature flag for logging without blocking
  - rbac_denied and rbac_shadow_denied audit action types
  - AdminRolesGuard with flag-aware RBAC enforcement
affects:
  - 23-02 (role migration script will use these flags)
  - 23-03 (staged rollout depends on flag toggling)
  - 23-04 (verification uses shadow logs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feature flag pattern for gradual rollout (rbacEnabled defaults false, requires explicit 'true')"
    - "Shadow mode pattern for logging would-be denials without blocking"
    - "Synthetic tenant ID (00000000-0000-0000-0000-000000000000) for admin audit logs"

key-files:
  created: []
  modified:
    - api/src/config/configuration.ts
    - api/.env.example
    - api/src/modules/audit-logs/entities/audit-log.entity.ts
    - api/src/modules/admin/guards/admin-roles.guard.ts

key-decisions:
  - "ADMIN_RBAC_ENABLED defaults to false, requires explicit 'true' for safety"
  - "ADMIN_RBAC_SHADOW_MODE defaults to true for baseline data collection"
  - "Audit logging is fire-and-forget (errors logged but don't block request)"

patterns-established:
  - "Gradual rollout: RBAC off by default, shadow mode on by default"
  - "ConfigService injection in guards for runtime flag checking"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 23 Plan 01: Feature Flags for RBAC Enforcement Summary

**RBAC feature flags with shadow mode logging in AdminRolesGuard for safe, gradual rollout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-02T23:31:17Z
- **Completed:** 2026-02-02T23:34:11Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added ADMIN_RBAC_ENABLED and ADMIN_RBAC_SHADOW_MODE feature flags to configuration
- Added rbac_denied and rbac_shadow_denied audit action types
- Modified AdminRolesGuard to check flags and log RBAC decisions
- Shadow mode allows collecting baseline data without disrupting existing users

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ADMIN_RBAC feature flags to configuration** - `5101209` (feat)
2. **Task 2: Add RBAC audit action types** - `9f6af29` (feat)
3. **Task 3: Implement feature flag checking and shadow mode in AdminRolesGuard** - `b3d6835` (feat)

## Files Created/Modified

- `api/src/config/configuration.ts` - Added admin.rbacEnabled and admin.rbacShadowMode config
- `api/.env.example` - Documented ADMIN_RBAC_ENABLED and ADMIN_RBAC_SHADOW_MODE flags
- `api/src/modules/audit-logs/entities/audit-log.entity.ts` - Added rbac_denied and rbac_shadow_denied action types
- `api/src/modules/admin/guards/admin-roles.guard.ts` - Injected ConfigService and AuditLogsService, implemented flag-aware RBAC

## Decisions Made

- ADMIN_RBAC_ENABLED requires explicit 'true' (config.ADMIN_RBAC_ENABLED === 'true') for safety
- ADMIN_RBAC_SHADOW_MODE defaults to true unless explicitly set to 'false'
- Audit log failures are caught and logged but don't block the request (availability over logging)
- Uses synthetic tenant ID 00000000-0000-0000-0000-000000000000 for admin audit logs (per Phase 17 decision)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all files compiled and linted successfully on first attempt.

## User Setup Required

None - no external service configuration required. Feature flags have safe defaults (RBAC off, shadow mode on).

## Next Phase Readiness

- Feature flags ready for Phase 23-02 (Role Migration Script)
- AdminRolesGuard now respects flags, ready for controlled rollout
- Shadow mode can be enabled immediately to start collecting baseline data
- No blockers or concerns

---
*Phase: 23-migration-rollout*
*Completed: 2026-02-02*
