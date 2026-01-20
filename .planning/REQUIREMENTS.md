# Requirements: Nebula DNS Admin Dashboard v1.2

// Nebula DNS Admin Dashboard - Requirements Definition
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Defined:** 2026-01-19
**Core Value:** Enable ops team to manage MSPs entirely through the UI — with proper role separation and proactive alerting.

## v1.2 Requirements

Requirements for v1.2 milestone: Admin Roles & Alerting.

### RBAC

- [ ] **RBAC-01**: Admin entity has role column (super_admin, admin, viewer)
- [ ] **RBAC-02**: AdminRolesGuard validates role against required roles per endpoint
- [ ] **RBAC-03**: @AdminRoles() decorator specifies required roles on controllers
- [ ] **RBAC-04**: Admin JWT contains role claim for frontend permission checks
- [ ] **RBAC-05**: All /admin/* endpoints have role requirements defined
- [ ] **RBAC-06**: UI displays admin's current role in header/profile
- [ ] **RBAC-07**: UI navigation filters menu items based on role permissions
- [ ] **RBAC-08**: Viewer role has read-only access (403 on mutating actions)
- [ ] **RBAC-09**: Server rejects self-role-escalation attempts with 403
- [ ] **RBAC-10**: Break-glass Super Admin account exists before enforcement

### Admin User Management

- [ ] **USER-01**: Super Admin can view list of all admin users with roles
- [ ] **USER-02**: Super Admin can invite new admin via email with role assignment
- [ ] **USER-03**: Invite tokens are hashed, expire after 7 days
- [ ] **USER-04**: Invited admin can accept and set password/MFA
- [ ] **USER-05**: Super Admin can view admin profile details
- [ ] **USER-06**: Super Admin can suspend admin (blocks login)
- [ ] **USER-07**: Super Admin can reactivate suspended admin
- [ ] **USER-08**: Super Admin can reset another admin's MFA
- [ ] **USER-09**: MFA reset sends notification email to target admin
- [ ] **USER-10**: Admin activity log captures auth, management, and sensitive actions
- [ ] **USER-11**: Super Admin can view pending invites with expiry status
- [ ] **USER-12**: Super Admin can revoke pending invites

### Alerting Integrations

- [ ] **ALERT-01**: Slack webhook can be configured with channel URL
- [ ] **ALERT-02**: PagerDuty routing key can be configured
- [ ] **ALERT-03**: Alert configs are encrypted at rest
- [ ] **ALERT-04**: System health issues trigger alerts (service down, high error rate)
- [ ] **ALERT-05**: Billing issues trigger alerts (payment failures)
- [ ] **ALERT-06**: Security events trigger alerts (failed logins, suspicious impersonation)
- [ ] **ALERT-07**: Critical alerts route to PagerDuty, warnings to Slack only
- [ ] **ALERT-08**: Admin can enable/disable each integration independently
- [ ] **ALERT-09**: Admin can send test alert to verify configuration
- [ ] **ALERT-10**: PagerDuty uses consistent dedup_key format to prevent incident explosion

### Migration & Rollout

- [ ] **ROLL-01**: Feature flag controls RBAC enforcement (ADMIN_RBAC_ENABLED)
- [ ] **ROLL-02**: Shadow mode logs would-be denials without enforcing
- [ ] **ROLL-03**: Migration script assigns Super Admin to designated admin
- [ ] **ROLL-04**: Documentation for admin communication before enforcement
- [ ] **ROLL-05**: Monitoring for increased 403 responses post-enforcement

## Future Requirements (v2+)

### Advanced RBAC

- **RBAC-F01**: Custom role builder with granular permissions
- **RBAC-F02**: Role hierarchy inheritance

### Advanced Alerting

- **ALERT-F01**: Email alerting channel
- **ALERT-F02**: Microsoft Teams integration
- **ALERT-F03**: Custom alert message templates
- **ALERT-F04**: Alert history and audit trail UI
- **ALERT-F05**: Alert acknowledgment workflow

### Advanced Admin Management

- **USER-F01**: Bulk admin invitation
- **USER-F02**: Admin self-service profile photo
- **USER-F03**: Admin group/team organization
- **USER-F04**: SSO for admin portal

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom role builder | 3-role hierarchy sufficient for 2-5 person team |
| Per-MSP alerting rules | Alerting is for ops team, not per-tenant |
| Real-time collaboration | Ops team uses existing tools (Slack) |
| Alert history UI | Start simple, add if needed based on usage |
| Admin profile photos | Non-essential for internal tool |

## Traceability

_Populated during roadmap creation_

| Requirement | Phase | Status |
|-------------|-------|--------|
| RBAC-01 | TBD | Pending |
| RBAC-02 | TBD | Pending |
| RBAC-03 | TBD | Pending |
| RBAC-04 | TBD | Pending |
| RBAC-05 | TBD | Pending |
| RBAC-06 | TBD | Pending |
| RBAC-07 | TBD | Pending |
| RBAC-08 | TBD | Pending |
| RBAC-09 | TBD | Pending |
| RBAC-10 | TBD | Pending |
| USER-01 | TBD | Pending |
| USER-02 | TBD | Pending |
| USER-03 | TBD | Pending |
| USER-04 | TBD | Pending |
| USER-05 | TBD | Pending |
| USER-06 | TBD | Pending |
| USER-07 | TBD | Pending |
| USER-08 | TBD | Pending |
| USER-09 | TBD | Pending |
| USER-10 | TBD | Pending |
| USER-11 | TBD | Pending |
| USER-12 | TBD | Pending |
| ALERT-01 | TBD | Pending |
| ALERT-02 | TBD | Pending |
| ALERT-03 | TBD | Pending |
| ALERT-04 | TBD | Pending |
| ALERT-05 | TBD | Pending |
| ALERT-06 | TBD | Pending |
| ALERT-07 | TBD | Pending |
| ALERT-08 | TBD | Pending |
| ALERT-09 | TBD | Pending |
| ALERT-10 | TBD | Pending |
| ROLL-01 | TBD | Pending |
| ROLL-02 | TBD | Pending |
| ROLL-03 | TBD | Pending |
| ROLL-04 | TBD | Pending |
| ROLL-05 | TBD | Pending |

**Coverage:**
- v1.2 requirements: 37 total
- Mapped to phases: 0
- Unmapped: 37

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 after initial definition*
