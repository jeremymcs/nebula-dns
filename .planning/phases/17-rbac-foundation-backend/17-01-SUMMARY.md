---
phase: 17-rbac-foundation-backend
plan: 01
subsystem: auth
tags: [rbac, guards, decorators, typeorm, nestjs, enum]

# Dependency graph
requires:
  - phase: none
    provides: Admin entity and authentication already exist from v1
provides:
  - AdminRole enum (SUPER_ADMIN, ADMIN, VIEWER)
  - ADMIN_ROLE_HIERARCHY for privilege comparison
  - hasMinimumRole() helper function
  - AdminRoles decorator for endpoint annotation
  - AdminRolesGuard for role validation
  - Admin entity with role column
  - Database migration for role column
affects: [17-02 JWT integration, 17-03 endpoint annotation, 19 admin user management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Admin RBAC guard pattern (AdminAuthGuard + AdminRolesGuard)
    - Metadata-based role decorator (SetMetadata + Reflector)

key-files:
  created:
    - api/src/modules/admin/enums/admin-role.enum.ts
    - api/src/modules/admin/decorators/admin-roles.decorator.ts
    - api/src/modules/admin/guards/admin-roles.guard.ts
    - api/src/database/migrations/1713000000000-AddAdminRoleColumn.ts
  modified:
    - api/src/modules/admin/entities/admin.entity.ts

key-decisions:
  - "Default role is 'admin' not 'super_admin' for security - must be explicitly assigned"
  - "Default guard policy: allow access if no @AdminRoles() decorator (documented)"
  - "403 responses include required role(s) for debugging"
  - "Distinct ADMIN_ROLES_KEY prevents collision with tenant RBAC"

patterns-established:
  - "AdminRole enum pattern: value strings match database values"
  - "Guard chain order: AdminAuthGuard then AdminRolesGuard"
  - "Role hierarchy: numeric levels for privilege comparison"

# Metrics
duration: 2min
completed: 2026-01-20
---

# Phase 17 Plan 01: Role Infrastructure Summary

**AdminRole enum with three-tier hierarchy (SUPER_ADMIN/ADMIN/VIEWER), @AdminRoles() decorator, and AdminRolesGuard with helpful 403 messages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-20T16:33:36Z
- **Completed:** 2026-01-20T16:35:37Z
- **Tasks:** 5
- **Files created:** 4
- **Files modified:** 1

## Accomplishments

- AdminRole enum with hierarchy levels (3/2/1) and hasMinimumRole() helper
- @AdminRoles() decorator using SetMetadata for endpoint protection
- AdminRolesGuard with clear 403 messages including required role(s)
- Admin entity updated with role column typed to AdminRole enum
- Database migration ready for role column with index

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AdminRole enum and hierarchy** - `77ea579` (feat)
2. **Task 2: Create @AdminRoles() decorator** - `d650823` (feat)
3. **Task 3: Create AdminRolesGuard** - `81b7260` (feat)
4. **Task 4: Update Admin entity with role column** - `7850570` (feat)
5. **Task 5: Create database migration for role column** - `2563d8a` (feat)

## Files Created/Modified

**Created:**
- `api/src/modules/admin/enums/admin-role.enum.ts` - AdminRole enum, hierarchy constant, hasMinimumRole helper
- `api/src/modules/admin/decorators/admin-roles.decorator.ts` - @AdminRoles() decorator with ADMIN_ROLES_KEY
- `api/src/modules/admin/guards/admin-roles.guard.ts` - Role validation guard with helpful 403 messages
- `api/src/database/migrations/1713000000000-AddAdminRoleColumn.ts` - Migration to add role column with index

**Modified:**
- `api/src/modules/admin/entities/admin.entity.ts` - Added role column with AdminRole type

## Decisions Made

1. **Default role is 'admin' not 'super_admin'** - Security measure ensuring super_admin privileges must be explicitly assigned. New admins created via migration or UI get 'admin' by default.

2. **Default guard policy: allow if no roles specified** - Unannotated endpoints accessible to all authenticated admins. This is documented in guard comments. Plan 03 will annotate all existing endpoints.

3. **Helpful 403 messages** - "Requires super_admin or admin role" format aids debugging without exposing sensitive information.

4. **Separate metadata key** - ADMIN_ROLES_KEY = 'admin_roles' prevents collision with tenant ROLES_KEY = 'roles'.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues. TypeScript compilation passed after each task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (JWT Integration):**
- AdminRole enum available for import in JWT payload
- AdminRolesGuard ready to read role from request.user
- Migration file exists (will be run in Plan 04 after break-glass setup)

**Blockers:** None

**Note:** Migration should NOT be run yet - Plan 04 will handle migration execution after break-glass super_admin creation is implemented.

---
*Phase: 17-rbac-foundation-backend*
*Plan: 01-role-infrastructure*
*Completed: 2026-01-20*
