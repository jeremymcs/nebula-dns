# Project State

// Nebula DNS Admin Dashboard - Project State
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Enable ops team to manage MSPs entirely through the UI — with proper role separation and proactive alerting.
**Current focus:** v1.2 Admin Roles & Alerting

## Current Position

Phase: 19 - Admin User Management (Backend)
Plan: 02 of 3 complete
Status: In progress
Last activity: 2026-01-22 — Completed 19-02-admin-dtos-PLAN.md

Progress: [██████░░░░░░░░░░░░░░░░] 27% (10/37 requirements addressed)

## Milestone v1.2 Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 17 | RBAC Foundation (Backend) | 8 | Complete (4/4 plans) |
| 18 | RBAC UI | 2 | Complete (2/2 plans) |
| 19 | Admin User Management (Backend) | 12 | In Progress (2/3 plans) |
| 20 | Admin User Management (UI) | 0* | Not Started |
| 21 | Alerting Integrations (Backend) | 10 | Not Started |
| 22 | Alerting Configuration (UI) | 0* | Not Started |
| 23 | Migration & Rollout | 5 | Not Started |

*UI phases implement frontend for requirements assigned to backend phases.

**Total:** 7 phases, 37 requirements

## Milestones Shipped

### v1.1 Mission Control Frontend (2026-01-19)
- 8 phases (9-16), 16 plans
- 35 requirements complete
- 106 files modified, 22,159 LOC added
- Full admin UI for MSP management

### v1 Backend API (2026-01-18)
- 8 phases (1-8), 17 plans
- 23 requirements complete
- 19 API endpoints
- Complete admin backend

## Accumulated Context

### Decisions

Key decisions from v1 and v1.1 are documented in PROJECT.md Key Decisions table.

**v1.2 decisions:**

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Default role is 'admin' not 'super_admin' | Security - super_admin must be explicitly assigned | 17-01 |
| Default guard policy: allow if no @AdminRoles() | Unannotated endpoints accessible to authenticated admins | 17-01 |
| Helpful 403 messages with required role(s) | Aid debugging without exposing sensitive info | 17-01 |
| Separate ADMIN_ROLES_KEY from ROLES_KEY | Prevent collision between admin and tenant RBAC | 17-01 |
| Role stored directly in JWT payload | Avoids database lookup on every request for role check | 17-02 |
| Profile endpoint uses DB role with JWT fallback | DB value is authoritative, JWT provides fallback | 17-02 |
| Login and endImpersonation excluded from role guards | Login is public entry; endImpersonation uses tenant JWT | 17-03 |
| Logout allows all roles including VIEWER | Any authenticated admin should be able to logout | 17-03 |
| Guard order: AdminAuthGuard then AdminRolesGuard | AuthGuard populates user.role needed by RolesGuard | 17-03 |
| Synthetic tenant ID for admin audit logs | Admins not tenant-scoped, use 00000000-0000-0000-0000-000000000000 | 17-04 |
| Break-glass sets pending_mfa status | Security - requires MFA setup on first login | 17-04 |
| Session invalidation on role change | Force re-login with new role for security | 17-04 |
| AdminRole type matches backend exactly | Uses 'super_admin', 'admin', 'viewer' from backend enum | 18-01 |
| Numeric hierarchy for role comparison | super_admin=3, admin=2, viewer=1 enables hasMinimumRole checks | 18-01 |
| Super admin badge has glow effect | Red color with ring + shadow for visual prominence | 18-01 |
| PermissionGate default fallback is null | Implements hidden items pattern (not disabled/tooltip) | 18-01 |
| Navigation filtered dynamically by role | Items filtered using canAccess checks before render | 18-02 |
| Role badge shows in header and dropdown | Header: next to name (hidden mobile), Dropdown: with permissions list | 18-02 |
| Route protection returns boolean | useRequireRole hooks handle redirect + toast automatically | 18-02 |
| AuthContext provides basic role helpers | adminRole, isSuperAdmin, isAdmin, isViewer for simple checks | 18-02 |
| AdminInvitation uses SHA256 token hashing | Security - store hashes not raw tokens to limit exposure | 19-01 |
| AdminActivityLog does not extend BaseEntity | Append-only audit logs need no updatedAt field | 19-01 |
| Activity logs track 13 action types | Covers authentication, user management, security events | 19-01 |
| Invitations CASCADE DELETE on inviter deletion | Clean up pending invitations when admin is deleted | 19-01 |
| Activity logs SET NULL on target deletion | Preserve audit trail even if target admin deleted later | 19-01 |
| Password requires 14+ chars with complexity | Mixed case, numbers, symbols for security | 19-02 |
| Activity log default limit is 50 (max 200) | Higher than typical 20 for bulk compliance review | 19-02 |
| AdminInvitationResponseDto includes isExpired | Computed field avoids client-side logic duplication | 19-02 |
| All pagination uses cursor-based pattern | Consistent pattern across all admin endpoints | 19-02 |

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-22 01:10 UTC
Stopped at: Completed 19-02-admin-dtos-PLAN.md
Resume file: None

Next: Phase 19 Plan 03 - Admin service implementation
