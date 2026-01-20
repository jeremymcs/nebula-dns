---
phase: 17-rbac-foundation-backend
plan: 03
subsystem: auth
tags: [rbac, guards, decorators, nestjs, authorization]

# Dependency graph
requires:
  - phase: 17-01
    provides: AdminRolesGuard, AdminRoles decorator, AdminRole enum
provides:
  - All admin endpoints annotated with role requirements
  - Viewer role restricted to GET operations
  - Admin/Super Admin required for mutating operations
affects:
  - 17-04 (RBAC testing)
  - 19 (Admin User Management)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - UseGuards(AdminAuthGuard, AdminRolesGuard) pattern for admin routes
    - AdminRoles decorator for role-based access control

key-files:
  created: []
  modified:
    - api/src/modules/admin/admin.controller.ts

key-decisions:
  - "Login endpoint remains public - no guards"
  - "endImpersonation uses tenant JWT - not admin role checked"
  - "Logout allows all roles - any admin can logout"
  - "23 protected endpoints total"

patterns-established:
  - "GET endpoints allow all roles (SUPER_ADMIN, ADMIN, VIEWER)"
  - "POST/PATCH/DELETE endpoints require ADMIN or SUPER_ADMIN"
  - "Guard order: AdminAuthGuard then AdminRolesGuard"

# Metrics
duration: 15min
completed: 2026-01-20
---

# Phase 17 Plan 03: Endpoint Annotation Summary

**All 23 protected admin endpoints annotated with @AdminRoles() decorators - GET allows all roles, mutating operations require ADMIN or SUPER_ADMIN**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-20T17:00:00Z
- **Completed:** 2026-01-20T17:15:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added AdminRolesGuard import and integration with all protected endpoints
- Annotated 23 endpoints with @AdminRoles() decorator and appropriate roles
- GET endpoints (12) allow all roles: SUPER_ADMIN, ADMIN, VIEWER
- POST/PATCH/DELETE endpoints (11) restricted to SUPER_ADMIN and ADMIN
- Login and endImpersonation correctly excluded from role guards

## Task Commits

Each task was committed atomically:

1. **Task 1: Update AdminModule to export AdminRolesGuard** - (already done in 17-01)
2. **Task 2: Add AdminRolesGuard to controller and annotate endpoints** - `52863d0` (feat)

**Note:** Task 1 was already completed in Plan 17-01 (commit 81b7260), so only Task 2 was committed.

## Files Created/Modified
- `api/src/modules/admin/admin.controller.ts` - Added imports for AdminRolesGuard, AdminRoles, AdminRole; Added AdminRolesGuard to UseGuards on 23 endpoints; Added @AdminRoles() decorator with appropriate role arrays

## Endpoint Role Matrix

### GET Endpoints (All Roles)
| Endpoint | Roles |
|----------|-------|
| GET /tenants/search | SUPER_ADMIN, ADMIN, VIEWER |
| GET /msp/tenants | SUPER_ADMIN, ADMIN, VIEWER |
| GET /msp/tenants/:mspId | SUPER_ADMIN, ADMIN, VIEWER |
| GET /msp/tenants/:mspId/clients | SUPER_ADMIN, ADMIN, VIEWER |
| GET /me | SUPER_ADMIN, ADMIN, VIEWER |
| GET /system/health | SUPER_ADMIN, ADMIN, VIEWER |
| GET /system/errors | SUPER_ADMIN, ADMIN, VIEWER |
| GET /system/query-volume | SUPER_ADMIN, ADMIN, VIEWER |
| GET /tenants/:tenantId/billing/subscription | SUPER_ADMIN, ADMIN, VIEWER |
| GET /tenants/:tenantId/billing/invoices | SUPER_ADMIN, ADMIN, VIEWER |
| GET /tenants/:tenantId/billing/invoices/:invoiceId/pdf | SUPER_ADMIN, ADMIN, VIEWER |
| GET /tenants/:tenantId/billing/payment-methods | SUPER_ADMIN, ADMIN, VIEWER |

### POST/PATCH/DELETE Endpoints (Admin/Super Admin Only)
| Endpoint | Roles |
|----------|-------|
| POST /msp/tenants | SUPER_ADMIN, ADMIN |
| POST /impersonate/:tenantId | SUPER_ADMIN, ADMIN |
| POST /logout | SUPER_ADMIN, ADMIN, VIEWER |
| POST /sessions/revoke-all | SUPER_ADMIN, ADMIN |
| POST /tenants/:tenantId/billing/credits | SUPER_ADMIN, ADMIN |
| POST /tenants/:tenantId/billing/tier | SUPER_ADMIN, ADMIN |
| POST /tenants/:tenantId/billing/trial/extend | SUPER_ADMIN, ADMIN |
| POST /tenants/:tenantId/billing/grace/extend | SUPER_ADMIN, ADMIN |
| POST /tenants/:tenantId/billing/payment-methods | SUPER_ADMIN, ADMIN |
| PATCH /tenants/:tenantId/billing/payment-methods/default | SUPER_ADMIN, ADMIN |
| DELETE /tenants/:tenantId/billing/payment-methods/:paymentMethodId | SUPER_ADMIN, ADMIN |

### Unguarded Endpoints
| Endpoint | Reason |
|----------|--------|
| POST /login | Public authentication endpoint |
| POST /impersonate/end | Uses tenant JWT, not admin JWT |

## Decisions Made
- **Login remains public:** No guards on login - this is the authentication entry point
- **endImpersonation excluded:** Uses tenant JWT (issued during impersonation), not admin JWT
- **Logout allows all roles:** Any authenticated admin should be able to logout, including viewers
- **Guard ordering:** AdminAuthGuard MUST come before AdminRolesGuard to ensure user.role is available

## Deviations from Plan

None - plan executed exactly as written.

Note: Task 1 was already completed in Plan 17-01, so the work was effectively a no-op. This is expected as Plan 17-01 exported AdminRolesGuard as part of creating it.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All admin endpoints now have role-based access control annotations
- AdminRolesGuard will enforce roles once JWT contains the role claim
- Ready for Plan 17-04 (RBAC testing) to verify enforcement
- Ready for Plan 17-02 (JWT Integration) to add role to token payload

---
*Phase: 17-rbac-foundation-backend*
*Plan: 03-endpoint-annotation*
*Completed: 2026-01-20*
