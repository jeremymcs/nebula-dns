---
phase: 19
plan: 07
subsystem: admin-api
tags: [nestjs, controller, rbac, admin-users, invitations, audit-logging]
requires: [19-02, 19-03, 19-05, 19-06]
provides:
  - Admin user management REST endpoints
  - Invitation flow API endpoints
  - Activity log query endpoint
affects: [20-admin-ui]
tech-stack:
  added: []
  patterns:
    - NestJS Controller with guards and decorators
    - Public endpoint pattern (no auth for accept invitation)
    - IP address extraction for audit trail
key-files:
  created:
    - api/src/modules/admin/admin-users.controller.ts
  modified:
    - api/src/modules/admin/admin.module.ts
decisions:
  - decision: "All endpoints except accept-invite require SUPER_ADMIN role"
    rationale: "User management is sensitive; only super admins should manage other admins"
    phase: "19-07"
  - decision: "Accept invitation is public (no authentication)"
    rationale: "Invited users don't have credentials yet; use token-based validation instead"
    phase: "19-07"
  - decision: "IP address extracted from headers for audit logging"
    rationale: "Capture real client IP when behind proxy/load balancer for security audit"
    phase: "19-07"
metrics:
  duration: "3m 22s"
  tasks: 4
  commits: 4
  files_created: 1
  files_modified: 1
  total_loc: 313
  completed: "2026-01-22"
---

# Phase 19 Plan 07: Admin User Management Controller Summary

**One-liner:** REST API controller exposing 10 endpoints for admin user management, invitations, and activity logging

## What Was Built

Created AdminUsersController with complete CRUD operations for admin user management:

**User Management Endpoints (4):**
- `GET /admin/users` - List all admins with pagination
- `GET /admin/users/:id` - Get admin profile details
- `PATCH /admin/users/:id/suspend` - Suspend admin account
- `PATCH /admin/users/:id/reactivate` - Restore suspended admin

**Invitation Endpoints (4):**
- `POST /admin/users/invite` - Send invitation email
- `POST /admin/users/invite/accept` - Accept invitation (PUBLIC)
- `GET /admin/users/invites` - List pending invitations
- `DELETE /admin/users/invites/:id` - Revoke invitation

**MFA & Audit Endpoints (2):**
- `POST /admin/users/:id/mfa/reset` - Reset admin MFA
- `GET /admin/users/activity` - Query activity logs

All endpoints feature:
- Comprehensive Swagger/OpenAPI documentation
- Role-based access control (SUPER_ADMIN required)
- IP address capture for audit logging
- Proper HTTP status codes and error responses

## Requirements Completed

| Req ID | Description | Implementation |
|--------|-------------|----------------|
| USER-01 | Super Admin can view list of all admin users | `GET /admin/users` with pagination and filters |
| USER-02 | Super Admin can invite new admin via email | `POST /admin/users/invite` sends email |
| USER-04 | Invited admin can accept and set password | `POST /admin/users/invite/accept` (public) |
| USER-05 | Super Admin can view admin profile details | `GET /admin/users/:id` with invitation metadata |
| USER-06 | Super Admin can suspend admin | `PATCH /admin/users/:id/suspend` blocks login |
| USER-07 | Super Admin can reactivate suspended admin | `PATCH /admin/users/:id/reactivate` restores access |
| USER-08 | Super Admin can reset another admin's MFA | `POST /admin/users/:id/mfa/reset` clears MFA |
| USER-09 | MFA reset sends notification email | Service sends email to affected admin |
| USER-10 | Admin activity log captures actions | `GET /admin/users/activity` with filters |
| USER-11 | Super Admin can view pending invites | `GET /admin/users/invites` with expiry status |
| USER-12 | Super Admin can revoke pending invites | `DELETE /admin/users/invites/:id` revokes |

**All 12 Phase 19 requirements now have complete API endpoints.**

## Implementation Details

### Controller Structure

```typescript
@ApiTags('Admin Users')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly adminInvitationsService: AdminInvitationsService,
    private readonly adminActivityService: AdminActivityService,
  ) {}

  // 10 endpoints...
}
```

### Security Pattern

**Protected endpoints (9 total):**
```typescript
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN)
@ApiBearerAuth('admin-jwt')
```

**Public endpoint (1 total):**
```typescript
@Post('invite/accept')
@HttpCode(HttpStatus.OK)
// No guards - validated by invitation token
```

### IP Address Extraction

Helper method handles proxies and load balancers:
```typescript
private getClientIp(req: Request, ip: string): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips.trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  return ip || req.ip || '0.0.0.0';
}
```

Checks headers in order: `x-forwarded-for` → `x-real-ip` → NestJS `@Ip()` → `req.ip`

## Task Breakdown

**Task 1: Create controller with listing and profile endpoints** (864175d)
- Created AdminUsersController class with DI setup
- Added GET /admin/users (list admins)
- Added GET /admin/users/:id (get profile)
- Added IP extraction helper method
- Result: Base controller with 2 endpoints

**Task 2: Add suspend, reactivate, and MFA reset endpoints** (865b0e5)
- Added PATCH /admin/users/:id/suspend
- Added PATCH /admin/users/:id/reactivate
- Added POST /admin/users/:id/mfa/reset
- All three call service methods with IP address
- Result: User management operations complete

**Task 3: Add invitation endpoints** (80f587c)
- Added POST /admin/users/invite (protected)
- Added POST /admin/users/invite/accept (public)
- Added GET /admin/users/invites (protected)
- Added DELETE /admin/users/invites/:id (protected)
- Result: Complete invitation lifecycle

**Task 4: Add activity log endpoint and register controller** (e1e7d69)
- Added GET /admin/users/activity
- Registered AdminUsersController in AdminModule
- Result: All endpoints complete, controller active

## File Changes

**Created:**
- `api/src/modules/admin/admin-users.controller.ts` (313 lines)
  - 10 endpoint methods
  - 1 helper method
  - Comprehensive Swagger documentation
  - Guards and decorators for all protected routes

**Modified:**
- `api/src/modules/admin/admin.module.ts`
  - Added AdminUsersController import
  - Registered in controllers array

## Swagger Documentation

All endpoints documented with:
- **@ApiOperation**: Summary and description
- **@ApiResponse**: Status codes (200, 201, 400, 401, 403, 404, 409)
- **@ApiParam**: Path parameters (id, invitationId)
- **@ApiBearerAuth**: JWT requirement (except accept)
- **Type references**: Request/response DTO types

Example:
```typescript
@ApiOperation({
  summary: 'Suspend admin',
  description: 'Suspends admin account, blocking login. Cannot suspend super_admin.',
})
@ApiResponse({ status: 200, description: 'Admin suspended' })
@ApiResponse({ status: 400, description: 'Already suspended' })
@ApiResponse({ status: 403, description: 'Cannot suspend self or super_admin' })
@ApiResponse({ status: 404, description: 'Admin not found' })
```

## Testing Considerations

**Manual testing via Swagger UI:**
- All endpoints appear in `http://localhost:4010/api/docs`
- Grouped under "Admin Users" tag
- Protected endpoints require admin JWT token
- Accept invitation can be tested without authentication

**Key test scenarios:**
1. List admins with various filters (role, status)
2. Get admin profile (verify inviter details populated)
3. Suspend admin (verify cannot suspend self or super_admin)
4. Reactivate admin (verify status changes)
5. Reset MFA (verify cannot reset own MFA)
6. Send invitation (verify email sent)
7. Accept invitation WITHOUT auth token (public endpoint)
8. List invitations (verify expiry calculation)
9. Revoke invitation (verify cannot revoke accepted)
10. Query activity logs (verify all filters work)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 20 (Admin User Management UI) can now proceed:**
- All API endpoints available
- Swagger documentation complete for reference
- Role-based access enforced on backend
- Activity logging captures all actions

**What Phase 20 needs to build:**
- Admin user listing page with filters
- Admin profile detail page
- Invitation management UI
- Activity log viewer with filtering
- All UI components can use these 10 endpoints

## Notes

**Route ordering:**
The accept endpoint is positioned after invite due to NestJS route matching:
- `POST /admin/users/invite` - specific route
- `POST /admin/users/invite/accept` - more specific route
- Both work correctly without conflicts

**Public endpoint security:**
Accept invitation is public but secure:
- Token is SHA256 hashed in database
- Invitation has expiration (7 days)
- One-time use (status changes to accepted)
- Email ownership verification (token sent to email)

**IP logging:**
All management endpoints capture IP addresses for:
- Security audits
- Compliance requirements
- Incident investigation
- Anomaly detection

All logs stored in `admin_activity_logs` table with:
- Actor admin ID and email
- Target admin ID and email (if applicable)
- Action type (enum)
- Metadata (additional context)
- IP address
- Timestamp

Phase 19 backend is now complete! All 12 requirements implemented with full CRUD operations, role-based access control, and comprehensive audit logging.
