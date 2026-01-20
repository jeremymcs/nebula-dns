# Roadmap: Nebula DNS Admin Dashboard v1.2

// Nebula DNS Admin Dashboard - Roadmap
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Created:** 2026-01-20
**Milestone:** v1.2 Admin Roles & Alerting
**Core Value:** Enable ops team to manage MSPs entirely through the UI — with proper role separation and proactive alerting.

## Overview

This roadmap covers 7 phases (17-23) delivering role-based access control, admin user management, and alerting integrations for Mission Control. RBAC is foundational and must complete first, followed by admin management and alerting which can proceed in parallel. Migration & rollout is the final phase to safely enable enforcement.

## Phases

### Phase 17: RBAC Foundation (Backend)

**Goal:** Backend infrastructure for role-based access control is complete and ready for enforcement.

**Dependencies:** None (first phase of v1.2)

**Requirements:**
- RBAC-01: Admin entity has role column (super_admin, admin, viewer)
- RBAC-02: AdminRolesGuard validates role against required roles per endpoint
- RBAC-03: @AdminRoles() decorator specifies required roles on controllers
- RBAC-04: Admin JWT contains role claim for frontend permission checks
- RBAC-05: All /admin/* endpoints have role requirements defined
- RBAC-08: Viewer role has read-only access (403 on mutating actions)
- RBAC-09: Server rejects self-role-escalation attempts with 403
- RBAC-10: Break-glass Super Admin account exists before enforcement

**Success Criteria:**
1. Admin can authenticate and receive JWT containing role claim
2. GET requests to /admin/* succeed for all roles (super_admin, admin, viewer)
3. POST/PUT/DELETE requests return 403 for viewer role
4. Attempt to change own role to higher level returns 403
5. At least one super_admin account exists and can access all endpoints

---

### Phase 18: RBAC UI

**Goal:** Frontend displays role information and enforces role-based navigation/access.

**Dependencies:** Phase 17 (RBAC backend must exist)

**Requirements:**
- RBAC-06: UI displays admin's current role in header/profile
- RBAC-07: UI navigation filters menu items based on role permissions

**Success Criteria:**
1. Admin sees their current role displayed in the header/profile area
2. Viewer role sees reduced navigation (no user management, no alerting config)
3. Admin role sees standard navigation (no user management)
4. Super Admin sees full navigation including user management

---

### Phase 19: Admin User Management (Backend)

**Goal:** Super Admins can manage admin users through complete API endpoints.

**Dependencies:** Phase 17 (requires RBAC for access control)

**Requirements:**
- USER-01: Super Admin can view list of all admin users with roles
- USER-02: Super Admin can invite new admin via email with role assignment
- USER-03: Invite tokens are hashed, expire after 7 days
- USER-04: Invited admin can accept and set password/MFA
- USER-05: Super Admin can view admin profile details
- USER-06: Super Admin can suspend admin (blocks login)
- USER-07: Super Admin can reactivate suspended admin
- USER-08: Super Admin can reset another admin's MFA
- USER-09: MFA reset sends notification email to target admin
- USER-10: Admin activity log captures auth, management, and sensitive actions
- USER-11: Super Admin can view pending invites with expiry status
- USER-12: Super Admin can revoke pending invites

**Success Criteria:**
1. Super Admin can list all admin users and see their roles/status
2. Super Admin can send invite email with assigned role; invite token expires after 7 days
3. Invited admin can accept invite, set password, and configure MFA
4. Super Admin can suspend admin and suspended admin cannot log in
5. Activity log captures login attempts, admin CRUD, and MFA changes

---

### Phase 20: Admin User Management (UI)

**Goal:** Mission Control provides complete UI for admin user management.

**Dependencies:** Phase 19 (backend API must exist), Phase 18 (role-based nav for proper access)

**Requirements:** (Frontend implementation of USER-01 through USER-12)

Note: Requirements are assigned to Phase 19 as the primary phase. This phase delivers the UI components that consume those APIs.

**Success Criteria:**
1. Admin Users page shows table of all admins with role, status, last login
2. Invite Admin modal allows email entry and role selection
3. Admin detail drawer shows profile, activity log, and management actions
4. Suspend/Reactivate and Reset MFA buttons work with confirmation dialogs
5. Pending Invites section shows invites with expiry countdown and revoke action

---

### Phase 21: Alerting Integrations (Backend)

**Goal:** System can send alerts to Slack and PagerDuty based on configured rules.

**Dependencies:** Phase 17 (requires RBAC for config access control)

**Requirements:**
- ALERT-01: Slack webhook can be configured with channel URL
- ALERT-02: PagerDuty routing key can be configured
- ALERT-03: Alert configs are encrypted at rest
- ALERT-04: System health issues trigger alerts (service down, high error rate)
- ALERT-05: Billing issues trigger alerts (payment failures)
- ALERT-06: Security events trigger alerts (failed logins, suspicious impersonation)
- ALERT-07: Critical alerts route to PagerDuty, warnings to Slack only
- ALERT-08: Admin can enable/disable each integration independently
- ALERT-09: Admin can send test alert to verify configuration
- ALERT-10: PagerDuty uses consistent dedup_key format to prevent incident explosion

**Success Criteria:**
1. Slack webhook URL can be stored encrypted and test message sent to channel
2. PagerDuty routing key can be stored encrypted and test incident triggered
3. Service down or high error rate triggers alert to configured channels
4. Payment failure triggers billing alert; suspicious impersonation triggers security alert
5. Critical severity routes to PagerDuty, warning severity routes to Slack only

---

### Phase 22: Alerting Configuration (UI)

**Goal:** Mission Control provides UI for configuring and testing alerting integrations.

**Dependencies:** Phase 21 (backend API must exist), Phase 18 (role-based nav)

**Requirements:** (Frontend implementation of ALERT-01 through ALERT-10)

Note: Requirements are assigned to Phase 21 as the primary phase. This phase delivers the UI components for configuration.

**Success Criteria:**
1. Alerting Settings page shows Slack and PagerDuty integration cards
2. Each integration has enable/disable toggle and configuration form
3. Slack config form accepts webhook URL with validation
4. PagerDuty config form accepts routing key with validation
5. Test Alert button sends test and shows success/failure feedback

---

### Phase 23: Migration & Rollout

**Goal:** RBAC can be safely enabled in production with monitoring and rollback capability.

**Dependencies:** Phases 17-22 (all features complete before enforcement)

**Requirements:**
- ROLL-01: Feature flag controls RBAC enforcement (ADMIN_RBAC_ENABLED)
- ROLL-02: Shadow mode logs would-be denials without enforcing
- ROLL-03: Migration script assigns Super Admin to designated admin
- ROLL-04: Documentation for admin communication before enforcement
- ROLL-05: Monitoring for increased 403 responses post-enforcement

**Success Criteria:**
1. ADMIN_RBAC_ENABLED=false allows all admins full access (legacy mode)
2. Shadow mode logs would-be 403s without actually denying requests
3. Migration script successfully assigns super_admin role to specified email
4. Runbook exists documenting rollout steps and communication template
5. Grafana dashboard shows 403 response rate with alerts for anomalies

---

## Progress

| Phase | Name | Status | Requirements | Success Criteria |
|-------|------|--------|--------------|------------------|
| 17 | RBAC Foundation (Backend) | Not Started | 8 | 0/5 |
| 18 | RBAC UI | Not Started | 2 | 0/4 |
| 19 | Admin User Management (Backend) | Not Started | 12 | 0/5 |
| 20 | Admin User Management (UI) | Not Started | 0* | 0/5 |
| 21 | Alerting Integrations (Backend) | Not Started | 10 | 0/5 |
| 22 | Alerting Configuration (UI) | Not Started | 0* | 0/5 |
| 23 | Migration & Rollout | Not Started | 5 | 0/5 |

*UI phases implement frontend for requirements assigned to their backend counterpart phases.

**Total:** 7 phases, 37 requirements, 34 success criteria

## Dependency Graph

```
Phase 17 (RBAC Backend)
    |
    +---> Phase 18 (RBAC UI)
    |         |
    |         +---> Phase 20 (Admin Mgmt UI)
    |         |
    |         +---> Phase 22 (Alerting UI)
    |
    +---> Phase 19 (Admin Mgmt Backend) ---> Phase 20
    |
    +---> Phase 21 (Alerting Backend) ---> Phase 22

All Phases (17-22) ---> Phase 23 (Migration & Rollout)
```

## Coverage Summary

| Category | Requirements | Phase(s) |
|----------|--------------|----------|
| RBAC | 10 | 17 (8), 18 (2) |
| Admin User Management | 12 | 19 (12), 20 (UI) |
| Alerting | 10 | 21 (10), 22 (UI) |
| Migration & Rollout | 5 | 23 (5) |
| **Total** | **37** | **All mapped** |

---
*Roadmap created: 2026-01-20*
