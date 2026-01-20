# Research Summary: v1.2

// Nebula DNS Admin Dashboard - Research Summary for v1.2 Milestone
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Milestone:** v1.2 Admin Roles & Alerting
**Domain:** Internal Ops Admin Dashboard Enhancement
**Researched:** 2026-01-19
**Confidence:** HIGH

## Executive Summary

The v1.2 milestone adds three capabilities to Mission Control: role-based access control (Super Admin, Admin, Viewer), alerting integrations (Slack and PagerDuty), and admin user management (invites, activity logs, MFA management). The existing codebase provides strong foundations — the tenant RolesGuard pattern can be adapted for admin RBAC, the webhook and SIEM integration patterns provide blueprints for alerting, and the FamilyInvitation entity structure serves as a template for admin invites.

The recommended approach is to build RBAC first as the foundation, then layer admin management and alerting on top. The three-role hierarchy (Super Admin > Admin > Viewer) is sufficient for a 2-5 person ops team and should not be expanded. Only one new dependency is required: `@slack/webhook@^7.0.0`. PagerDuty integration uses direct HTTP calls to Events API v2, avoiding stale SDK packages.

The primary risks are admin self-lockout during RBAC migration (addressed by creating a break-glass Super Admin before enforcement) and alert fatigue from overly verbose configuration (addressed by starting with critical-only alerts). A gradual rollout with feature flags and shadow mode logging will allow safe transition without big-bang deployment risk.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Admin RBAC Library | No new library (extend existing) | RolesGuard pattern already works, 3 roles don't need CASL complexity |
| Slack Integration | `@slack/webhook@^7.0.0` | Lightweight (100KB), webhooks-only, no OAuth overhead |
| PagerDuty Integration | Direct HTTP to Events API v2 | Official SDK is stale, API is simple, matches existing webhook patterns |
| Role Hierarchy | Flat with 3 roles | Super Admin, Admin, Viewer cover all use cases for small ops team |
| Invite Token Storage | Hashed with 7-day expiry | Matches existing FamilyInvitation pattern |
| Alert Config Storage | Encrypted JSON (reuse SIEM pattern) | Webhook URLs are sensitive credentials |
| Rollout Strategy | Feature flags with shadow mode | Avoid big-bang deployment, log what would be denied before enforcing |

---

## Stack Additions

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| `@slack/webhook` | ^7.0.0 | Slack alerting | Official SDK, 100KB, webhooks-only |

**No new dependencies for:**
- Admin RBAC (extend existing RolesGuard pattern)
- PagerDuty (direct HTTP to Events API v2)
- Admin invitations (extend existing email service)
- Activity logging (extend existing AuditLogsService)
- MFA management (extend existing AdminMfa entity)

**Environment Variables to Add:**
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
PAGERDUTY_ROUTING_KEY=your-integration-key
ADMIN_DASHBOARD_URL=https://admin.nebuladns.com
ADMIN_RBAC_ENABLED=false
ADMIN_RBAC_SHADOW_MODE=true
```

---

## Feature Table Stakes

### RBAC

| Feature | Complexity | Notes |
|---------|------------|-------|
| Role column on Admin entity | Low | Migration adds `role` VARCHAR(20) |
| Role in JWT claims | Low | Extend AdminJwtPayload |
| AdminRolesGuard with @AdminRoles() decorator | Medium | Mirrors existing RolesGuard pattern |
| Role-based route protection | Medium | Apply guards to all /admin/* endpoints |
| UI role display and menu filtering | Medium | Update AdminAuthContext, NavigationConfig |
| Prevent self-role-escalation | Low | Business logic check in update endpoint |
| Break-glass Super Admin account | Low | Required before enforcement |

### Alerting

| Feature | Complexity | Notes |
|---------|------------|-------|
| Slack webhook notifications | Medium | @slack/webhook for delivery |
| PagerDuty incident creation | Medium | Direct HTTP, dedup_key management |
| Alert enable/disable toggle | Low | Per-integration configuration |
| Test alert functionality | Low | Send clearly-marked test messages |
| Severity-based routing | Low | Critical -> PagerDuty, Warning -> Slack only |
| Alert config encrypted storage | Low | Reuse SIEM encryption pattern |

### Admin Management

| Feature | Complexity | Notes |
|---------|------------|-------|
| List all admin users | Low | Simple query with role badges |
| Invite new admin via email | Medium | Token generation, email, acceptance flow |
| Admin accepts invite, sets password | Medium | Token validation, Admin entity creation |
| View admin profile/details | Low | Basic CRUD |
| Suspend/reactivate admin | Low | Status field update |
| Reset admin MFA | Medium | Requires Super Admin, sends notification |
| Admin activity logging | Medium | Extend AuditLogsService with admin context |
| Pending invites dashboard | Low | Query AdminInvitation with expiry display |

---

## Permission Matrix

| Action | Super Admin | Admin | Viewer |
|--------|:-----------:|:-----:|:------:|
| **Authentication** ||||
| Login to admin dashboard | Yes | Yes | Yes |
| View/revoke own sessions | Yes | Yes | Yes |
| **MSP Operations** ||||
| View MSP listing | Yes | Yes | Yes |
| Search MSPs | Yes | Yes | Yes |
| Create/edit MSP | Yes | Yes | No |
| **Tenant Operations** ||||
| Search tenants | Yes | Yes | Yes |
| Start impersonation | Yes | No | No |
| View impersonation audit logs | Yes | Yes | Yes |
| **Billing Operations** ||||
| View subscription/invoices | Yes | Yes | Yes |
| Apply credit/adjustment | Yes | Yes | No |
| Change tier/extend trial | Yes | Yes | No |
| **System Health** ||||
| View health dashboard | Yes | Yes | Yes |
| View error rates/logs | Yes | Yes | Yes |
| **Admin Management** ||||
| View admin users list | Yes | Yes | Yes |
| Invite new admin | Yes | No | No |
| Change admin roles | Yes | No | No |
| Suspend/reactivate admin | Yes | No | No |
| Reset admin MFA | Yes | No | No |
| View admin activity logs | Yes | Yes | Yes |
| **Alert Configuration** ||||
| View alert settings | Yes | Yes | Yes |
| Configure alerts | Yes | Yes | No |
| Acknowledge alerts | Yes | Yes | No |

---

## Architecture Highlights

### New Components

**API Layer:**
```
api/src/modules/admin/
├── guards/admin-roles.guard.ts         # NEW: RBAC guard
├── decorators/admin-roles.decorator.ts # NEW: @AdminRoles()
├── services/admin-alerting.service.ts  # NEW: Slack/PagerDuty delivery
├── entities/
│   ├── admin.entity.ts                 # MODIFY: Add role column
│   ├── admin-invitation.entity.ts      # NEW
│   └── admin-alert-config.entity.ts    # NEW
└── dto/
    ├── admin-user-management.dto.ts    # NEW
    ├── admin-invitation.dto.ts         # NEW
    └── admin-alerting.dto.ts           # NEW
```

**UI Layer:**
```
ui/src/app/mission-control/settings/
├── users/page.tsx                      # NEW: Admin user management
└── alerts/page.tsx                     # NEW: Alert configuration

ui/src/components/
├── AdminUserTable.tsx                  # NEW
├── InviteAdminModal.tsx                # NEW
├── AlertConfigForm.tsx                 # NEW
└── RoleGate.tsx                        # NEW: Conditional rendering

ui/src/hooks/
├── useAdminRole.ts                     # NEW: Permission checking
└── useAdminUsers.ts                    # NEW: Admin CRUD hook
```

### Database Schema

**Migrations Required:**
1. `AddAdminRole` - Add `role` column to `admins` with default 'admin'
2. `CreateAdminInvitations` - New table for invite tokens
3. `CreateAdminAlertConfigs` - New table for Slack/PagerDuty configs

### Key Integration Points

| Existing Component | Integration Approach |
|-------------------|----------------------|
| `RolesGuard` | Mirror pattern for `AdminRolesGuard` |
| `WebhooksService.deliver()` | Adapt retry logic for alert delivery |
| `SiemIntegration` encryption | Reuse for alert config storage |
| `EmailService` | Add `sendAdminInviteEmail()` method |
| `AuditLogsService` | Extend with admin resource types |
| `AdminHealthService` | Integrate with alerting for system events |

---

## Critical Pitfalls

### 1. Admin Self-Lockout During Migration (P-RBAC-01)
**Severity:** CRITICAL
**Prevention:**
- Create break-glass Super Admin account with MFA before any migration
- Migration script must verify at least one Super Admin exists pre/post
- AdminRolesGuard must gracefully handle admins without role during transition
- Store break-glass credentials in secure vault

### 2. Inconsistent Permission Enforcement (P-RBAC-03)
**Severity:** HIGH
**Prevention:**
- Single source of truth: `AdminRolesGuard` decorator on ALL protected endpoints
- Permission definitions shared between API and UI
- E2E tests verifying 403 responses for unauthorized role attempts
- Audit all 20+ existing `/admin/*` endpoints during Phase 1

### 3. Alert Fatigue from Verbose Configuration (P-ALERT-02)
**Severity:** HIGH
**Prevention:**
- Start with critical-only alerts: service down, DB failure, security breach
- Every alert must have documented response action
- PagerDuty for critical only, Slack for warnings
- Implement alert deduplication with consistent `dedup_key` format

### 4. Self-Service Role Escalation (P-ADMIN-02)
**Severity:** HIGH
**Prevention:**
- Explicit server-side check: `if (targetAdminId === currentAdminId) throw Forbidden`
- Role changes require Super Admin role
- Audit log with both actor and target admin IDs
- E2E test: admin self-promotion returns 403

### 5. MFA Reset Without Verification (P-ADMIN-03)
**Severity:** HIGH
**Prevention:**
- MFA reset for others requires Super Admin role
- Email notification sent to target admin when MFA is reset
- Audit log all MFA management actions
- Consider 24-hour delay unless target confirms via email

### 6. Big Bang Deployment (P-MIG-01)
**Severity:** HIGH
**Prevention:**
- Feature flag: `ADMIN_RBAC_ENABLED=false` initially
- Shadow mode: log what RBAC would deny without actually denying
- Gradual rollout: enable for single admin, then team, then all
- Email admins 1 week before enforcement starts

### 7. PagerDuty Deduplication Mismanagement (P-ALERT-03)
**Severity:** MEDIUM
**Prevention:**
- Define `dedup_key` format upfront: `nebula-admin.{component}.{issue_type}`
- Document key format for consistent usage
- Test resolve events actually close incidents
- Log `dedup_key` in audit trail

---

## Recommended Phase Order

### Phase 1: Admin RBAC Foundation
**Rationale:** RBAC is foundational - alerting config permissions and admin management both depend on role checking being in place first.

**Delivers:**
- Role column on Admin entity with migration
- AdminRolesGuard and @AdminRoles() decorator
- Role-protected endpoints for all /admin/* routes
- UI role display and permission-based menu filtering
- Break-glass Super Admin account

**Addresses Features:**
- Role assignment on admin entity
- Role-based route guards
- Role display in UI
- Viewer read-only access

**Avoids Pitfalls:**
- P-RBAC-01 (Self-lockout) - break-glass account created first
- P-RBAC-03 (Inconsistent enforcement) - centralized guard pattern
- P-RBAC-05 (Viewer write access) - explicit endpoint audit

**Effort:** 1-2 weeks

### Phase 2: Admin User Management
**Rationale:** Needs RBAC to protect management endpoints. Invite flow builds on existing email infrastructure.

**Delivers:**
- Admin invitation table and entity
- Invite flow: create invite, send email, accept with password/MFA setup
- Admin CRUD: list, view, update, suspend, reactivate
- MFA reset capability for Super Admins
- Pending invites dashboard with expiry

**Addresses Features:**
- List/view admin users
- Invite new admin via email
- Suspend/reactivate admins
- Reset admin MFA
- Admin activity logging

**Avoids Pitfalls:**
- P-ADMIN-01 (Invite without expiration) - 7-day default expiry
- P-ADMIN-02 (Self-escalation) - explicit self-modification check
- P-ADMIN-03 (MFA reset security) - Super Admin required, notification sent

**Effort:** 2 weeks

### Phase 3: Alerting Integrations
**Rationale:** Isolated feature with no dependency on Phase 2. Can run in parallel after Phase 1 completes.

**Delivers:**
- AdminAlertingService with Slack and PagerDuty delivery
- Alert configuration table and UI
- System health integration for automatic alerts
- Test alert functionality
- Severity-based routing (critical -> PagerDuty, warning -> Slack)

**Addresses Features:**
- Slack channel notifications
- PagerDuty incident creation
- Alert enable/disable toggle
- Test alert button
- Alert history

**Uses Stack:**
- `@slack/webhook@^7.0.0` for Slack
- Direct HTTP for PagerDuty Events API v2

**Avoids Pitfalls:**
- P-ALERT-02 (Alert fatigue) - start conservative, critical only
- P-ALERT-03 (Dedup key) - define format upfront
- P-ALERT-04 (No test) - test functionality is table stakes
- P-ALERT-05 (Rate limiting) - adapt existing WebhooksService pattern

**Effort:** 2 weeks

### Phase 4: Migration & Rollout
**Rationale:** After features are complete, gradual rollout with shadow mode prevents big-bang risks.

**Delivers:**
- Feature flags for RBAC enforcement
- Shadow mode logging (log denials without enforcing)
- Admin communication plan
- Production rollout runbook
- Monitoring for increased 403 responses

**Avoids Pitfalls:**
- P-MIG-01 (Big bang) - feature flags and gradual rollout
- P-MIG-02 (Missing mapping) - permission matrix validated
- P-MIG-03 (Breaking API consumers) - service account audit

**Effort:** 1 week

### Phase Ordering Rationale

1. **RBAC First** - Every other feature needs role checking. Cannot protect alert configuration or admin management without roles.

2. **Admin Management Before Alerting** - Not a strict dependency, but logical grouping. Both can run in parallel after RBAC.

3. **Gradual Rollout Last** - Shadow mode and feature flags require all features to be code-complete before validation phase.

4. **Parallel Execution Possible** - Phases 2 and 3 can run in parallel since they don't depend on each other, only on Phase 1.

---

## Research Flags

**Phases with Standard Patterns (skip deep research):**
- **Phase 1 (RBAC):** Existing RolesGuard pattern is well-documented and already working in codebase
- **Phase 2 (Admin Management):** FamilyInvitation entity provides complete blueprint

**Phases Needing Attention During Implementation:**
- **Phase 3 (Alerting):** Test PagerDuty dedup_key behavior with real integration key before production
- **Phase 4 (Rollout):** Inventory service accounts using admin API before enforcement

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 1 new dependency, well-maintained official SDK |
| Features | HIGH | Based on existing codebase analysis, clear extension points |
| Architecture | HIGH | All components exist or have clear patterns to follow |
| Pitfalls | HIGH | Based on industry sources and codebase-specific analysis |

**Overall Confidence:** HIGH

### Gaps to Address

| Gap | Resolution |
|-----|------------|
| Service account inventory | Audit during Phase 4 before enforcement |
| Alert threshold tuning | Start conservative, adjust based on production feedback |
| Role assignment for existing admins | Migration script must designate first Super Admin |

---

## Open Questions

1. **Who is the designated first Super Admin?** - Migration script needs explicit admin ID or email to promote.

2. **What Slack channel for alerts?** - Need channel name for webhook configuration.

3. **What PagerDuty escalation policy?** - Affects routing key setup.

4. **Are there any service accounts using admin API?** - Need inventory before RBAC enforcement.

5. **What is the acceptable alert threshold?** - How many alerts per day is tolerable before fatigue?

---

## Sources

### Stack Sources
- [npm @slack/webhook](https://www.npmjs.com/package/@slack/webhook)
- [Slack Node SDK Webhook Docs](https://docs.slack.dev/tools/node-slack-sdk/webhook/)
- [PagerDuty Events API v2](https://developer.pagerduty.com/docs/events-api-v2/trigger-events/)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [NestJS Authorization](https://docs.nestjs.com/security/authorization)

### Features Sources
- [10 RBAC Best Practices - Oso](https://www.osohq.com/learn/rbac-best-practices)
- [Role-Based Access Control Guide - StrongDM](https://www.strongdm.com/rbac)
- [Best Practices for Alerting Using PagerDuty - DrDroid](https://drdroid.io/engineering-tools/best-practices-for-alerting-using-pagerduty)
- [Guide to Building Audit Logs - Medium](https://medium.com/@tony.infisical/guide-to-building-audit-logs-for-application-software-b0083bb58604)

### Pitfalls Sources
- [6 Common RBAC Implementation Pitfalls - Idenhaus](https://idenhaus.com/rbac-implementation-pitfalls/)
- [Plan your Grafana RBAC rollout strategy - Grafana](https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/plan-rbac-rollout-strategy/)
- [Sending messages using incoming webhooks - Slack API](https://api.slack.com/messaging/webhooks)
- [PagerDuty API Essentials - Zuplo](https://zuplo.com/blog/2025/05/05/pagerduty-api)

### Architecture Sources
- Direct codebase analysis of existing admin module, guards, entities, and services

---

*Research completed: 2026-01-19*
*Ready for roadmap: yes*
