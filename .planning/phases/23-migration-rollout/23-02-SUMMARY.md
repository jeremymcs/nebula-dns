---
phase: 23-migration-rollout
plan: 02
subsystem: api
tags: [migration, rbac, admin, typescript, nestjs, typeorm]

# Dependency graph
requires:
  - phase: 17-rbac-foundation-backend
    provides: AdminRole enum and Admin entity for role assignment
provides:
  - CLI script for promoting existing admin to super_admin role
  - Idempotent migration tool for RBAC rollout
affects: [23-03, 23-04, 23-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration script pattern: NestFactory.createApplicationContext"
    - "Idempotent role assignment: check current role before update"

key-files:
  created:
    - api/src/scripts/assign-super-admin.ts
  modified: []

key-decisions:
  - "Script uses SUPER_ADMIN_EMAIL env var (not BREAK_GLASS_EMAIL) for clarity"
  - "Script does NOT create accounts, only promotes existing ones"
  - "Reports old role -> new role for audit purposes"

patterns-established:
  - "Role assignment scripts follow same NestFactory.createApplicationContext pattern"
  - "Environment variable naming: SUPER_ADMIN_EMAIL for role assignment"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 23 Plan 02: Assign Super Admin Script Summary

**CLI migration script for promoting existing admin to super_admin role before RBAC enforcement**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-02T23:31:45Z
- **Completed:** 2026-02-02T23:34:45Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created assign-super-admin.ts script following create-super-admin.ts pattern
- Script is idempotent (safe to run multiple times without side effects)
- Reports previous role for audit trail when promoting admin

## Task Commits

Each task was committed atomically:

1. **Task 1: Create assign-super-admin.ts migration script** - `1241c9f` (feat)

## Files Created/Modified
- `api/src/scripts/assign-super-admin.ts` - CLI script that promotes existing admin to super_admin role

## Decisions Made
- Uses SUPER_ADMIN_EMAIL environment variable (clearer purpose than BREAK_GLASS_EMAIL)
- Does NOT create new accounts - points to create-super-admin.ts if admin doesn't exist
- Exits successfully (code 0) if admin is already super_admin - idempotent behavior
- Reports previous role in success message for audit purposes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the existing create-super-admin.ts provided a clear pattern to follow.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Script ready for use in RBAC rollout procedures
- Complements create-super-admin.ts (break-glass) and future shadow mode feature flag
- Next: Shadow mode toggle (23-03) and RBAC enforcement toggle (23-04)

---
*Phase: 23-migration-rollout*
*Completed: 2026-02-02*
