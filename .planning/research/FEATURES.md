# Features Research: v1.2

// Nebula DNS Admin Dashboard - Feature Research for RBAC, Alerting, Admin Management
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Domain:** Internal Ops Admin Dashboard
**Researched:** 2026-01-19
**Context:** Adding role-based access, alerting integrations, and admin user management to existing Mission Control admin dashboard

## Executive Summary

This research covers three feature categories for the v1.2 milestone:

1. **Role-Based Access Control (RBAC)** - Adding Super Admin, Admin, and Viewer roles to the existing admin dashboard
2. **Alerting Integrations** - Slack and PagerDuty notifications for system events
3. **Admin User Management** - Invite flows, activity logging, and MFA management

The existing admin module already has solid foundations: JWT-based authentication, session management, audit logging infrastructure, and MFA support. The v1.2 features extend these capabilities rather than replacing them.

---

## Role-Based Access Control

### Table Stakes

Features users expect in any admin RBAC system. Missing = dashboard feels incomplete.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Role assignment on admin entity | Core RBAC building block | Low | Existing `Admin` entity |
| Role-based route guards | Prevent unauthorized access | Medium | Existing `AdminAuthGuard` |
| Role display in UI | Users need to see their access level | Low | Auth context |
| Super Admin can manage other admins | Role hierarchy requirement | Medium | Admin CRUD operations |
| Viewer can only read data | Basic separation of concerns | Low | Guard decorators |
| Admin cannot elevate own role | Self-escalation prevention | Low | Business logic check |
| Role shown in JWT claims | Stateless authorization | Low | Existing JWT infrastructure |
| Role-based menu filtering | UI reflects permissions | Medium | NavigationConfig.ts |

### Permission Matrix

Based on the existing admin dashboard features and the three requested roles:

| Action | Super Admin | Admin | Viewer |
|--------|-------------|-------|--------|
| **Authentication** ||||
| Login to admin dashboard | Yes | Yes | Yes |
| View own sessions | Yes | Yes | Yes |
| Revoke own sessions | Yes | Yes | Yes |
| **MSP Operations** ||||
| View MSP listing | Yes | Yes | Yes |
| Search MSPs | Yes | Yes | Yes |
| View MSP details/drill-down | Yes | Yes | Yes |
| Create new MSP (onboarding wizard) | Yes | Yes | No |
| Edit MSP configuration | Yes | Yes | No |
| **Tenant Operations** ||||
| Search tenants | Yes | Yes | Yes |
| Start impersonation session | Yes | Yes | No |
| View impersonation audit logs | Yes | Yes | Yes |
| **Billing Operations** ||||
| View subscription status | Yes | Yes | Yes |
| View invoice history | Yes | Yes | Yes |
| Apply credit/adjustment | Yes | Yes | No |
| Change subscription tier | Yes | Yes | No |
| Extend trial/grace period | Yes | Yes | No |
| **System Health** ||||
| View system health dashboard | Yes | Yes | Yes |
| View error rates/logs | Yes | Yes | Yes |
| View aggregate metrics | Yes | Yes | Yes |
| **Admin Management** ||||
| View admin users list | Yes | Yes | Yes |
| Invite new admin | Yes | No | No |
| Assign/change admin roles | Yes | No | No |
| Suspend/reactivate admin | Yes | No | No |
| Reset admin MFA | Yes | No | No |
| View admin activity logs | Yes | Yes | Yes |
| **Alert Configuration** ||||
| View alert settings | Yes | Yes | Yes |
| Configure alert thresholds | Yes | Yes | No |
| Manage Slack/PagerDuty integrations | Yes | Yes | No |
| View alert history | Yes | Yes | Yes |
| Acknowledge alerts | Yes | Yes | No |

### Role Hierarchy

```
Super Admin (full access)
    |
    v
Admin (operational access - can't manage admins)
    |
    v
Viewer (read-only access)
```

**Key Principle:** Admins can perform all day-to-day operational tasks (onboarding MSPs, billing adjustments, impersonation for support). Only Super Admins can manage the admin team itself.

### Differentiators

Nice-to-have features that add value but aren't essential for v1.2.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Custom permission sets | Fine-grained control beyond 3 roles | High | Defer - 3 roles sufficient for small team |
| Time-limited elevated access | Temporary role elevation for incidents | High | YAGNI for 2-5 person team |
| Permission inheritance | Roles inherit from parent roles | Medium | Unnecessary with flat hierarchy |
| Per-resource permissions | Access to specific MSPs only | High | Global access simpler for ops |
| Activity-based role suggestions | AI recommends role based on usage | High | Over-engineering |

### Anti-Features

Features to deliberately NOT build for RBAC.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Role hierarchy deeper than 3 levels | Complexity for 2-5 person team | Stick with Super Admin > Admin > Viewer |
| Self-service role changes | Security risk | Require Super Admin approval |
| External identity provider roles | Different trust boundary | Manage roles internally |
| API-only admin access | UI is the primary interface | Focus on UI-based access |
| Bulk role changes | Low volume of admins | One-at-a-time changes are fine |

### Implementation Notes

**Existing Infrastructure to Leverage:**
- `Admin` entity already exists with `status` field
- Add `role` column: `'super_admin' | 'admin' | 'viewer'`
- `AdminAuthGuard` can be extended with role checking
- JWT payload already has custom claims structure

**Guard Pattern:**
```typescript
// Decorator approach
@Roles('super_admin')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
async inviteAdmin() { ... }

// Or combined
@AdminOnly(['super_admin', 'admin'])
async createMsp() { ... }
```

---

## Alerting Integrations

### Table Stakes

Features expected in any ops alerting system.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Slack channel notifications | Primary communication tool | Medium | Slack webhook API |
| PagerDuty incident creation | On-call escalation | Medium | PagerDuty Events API |
| Alert enable/disable toggle | Control noise | Low | Settings storage |
| Test alert button | Verify configuration | Low | Existing alert types |
| Channel/service selection | Route alerts appropriately | Low | Integration config |
| Basic system health alerts | Proactive monitoring | Medium | Existing health service |

### Alert Types

System events that should trigger alerts, categorized by severity.

#### Critical Alerts (PagerDuty + Slack)

| Alert | Trigger Condition | Data to Include |
|-------|-------------------|-----------------|
| Service Down | Policy-svc, Unbound, or dnsdist unreachable | Service name, downtime duration, last healthy timestamp |
| Database Connection Failed | PostgreSQL or ClickHouse connection error | Database name, error message, retry count |
| Redis Connection Failed | Cache unavailable | Connection error, impact assessment |
| Error Rate Spike | Error rate > threshold (e.g., 5%) for N minutes | Current rate, baseline, affected services |

#### Warning Alerts (Slack only)

| Alert | Trigger Condition | Data to Include |
|-------|-------------------|-----------------|
| High Query Volume | Queries/second exceeds threshold | Current QPS, threshold, trend |
| Elevated Error Rate | Error rate > warning threshold (e.g., 1%) | Current rate, trending direction |
| Storage Approaching Limit | ClickHouse storage > 80% | Current usage, projected time to full |
| Certificate Expiring Soon | TLS cert expires within 14 days | Cert name, expiry date, domains |

#### Informational Alerts (Slack only, optional)

| Alert | Trigger Condition | Data to Include |
|-------|-------------------|-----------------|
| New MSP Onboarded | MSP created via wizard | MSP name, created by admin |
| Billing Adjustment Applied | Credit or tier change | Tenant name, amount/change, admin |
| Impersonation Started | Admin starts impersonation | Admin name, tenant name, timestamp |
| Admin Invited | New admin invitation sent | Invitee email, inviting admin |

### Alert Configuration Schema

```typescript
interface AlertConfig {
  id: string;
  alertType: string;
  enabled: boolean;
  severity: 'critical' | 'warning' | 'info';

  // Threshold configuration
  threshold?: number;
  thresholdUnit?: string;  // 'percent', 'count', 'seconds'
  consecutiveViolations?: number;  // Require N violations before alerting

  // Channel routing
  slackEnabled: boolean;
  slackChannel?: string;
  pagerdutyEnabled: boolean;
  pagerdutyServiceKey?: string;

  // Cooldown to prevent alert fatigue
  cooldownMinutes: number;

  createdAt: Date;
  updatedAt: Date;
  updatedByAdminId: string;
}
```

### Slack Message Format

```
:rotating_light: *Critical Alert: Service Down*

*Service:* policy-svc
*Status:* Unreachable
*Duration:* 3 minutes
*Last Healthy:* 2026-01-19 14:23:45 UTC

*Impact:* DNS policy evaluation may fail. Queries falling back to fail-open mode.

<https://admin.nebuladns.com/health|View System Health>
```

### PagerDuty Event Format

```json
{
  "routing_key": "<service-integration-key>",
  "event_action": "trigger",
  "dedup_key": "nebula-policy-svc-down-2026-01-19",
  "payload": {
    "summary": "Nebula DNS: policy-svc unreachable for 3 minutes",
    "severity": "critical",
    "source": "nebula-admin-dashboard",
    "component": "policy-svc",
    "group": "dns-infrastructure",
    "custom_details": {
      "service": "policy-svc",
      "duration_seconds": 180,
      "last_healthy": "2026-01-19T14:23:45Z",
      "dashboard_url": "https://admin.nebuladns.com/health"
    }
  }
}
```

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Alert history with trends | See patterns over time | Medium | Useful for post-mortems |
| Escalation policies | Auto-escalate if not ack'd | High | PagerDuty handles this |
| Custom alert messages | Personalized notification text | Low | Nice for branding |
| Alert acknowledgment tracking | Know who's handling it | Medium | Sync with PagerDuty |
| Scheduled maintenance windows | Suppress alerts during planned work | Medium | Reduce noise |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Email alerts | Everyone uses Slack/PagerDuty | Focus on Slack + PagerDuty |
| SMS direct integration | PagerDuty handles SMS | Let PagerDuty manage phone notifications |
| Complex alert routing rules | 2-5 person team doesn't need it | Single channel per severity |
| Alert grouping/correlation | Adds complexity | Let PagerDuty handle deduplication |
| Custom alert webhooks | Build integrations as needed | Start with Slack + PagerDuty only |
| AI-powered anomaly detection | ML complexity | Static thresholds sufficient |

### Implementation Notes

**Slack Integration:**
- Use incoming webhooks (simplest approach)
- Store webhook URL encrypted in database
- Format messages using Block Kit for rich formatting

**PagerDuty Integration:**
- Use Events API v2 (not REST API)
- Use `dedup_key` to prevent duplicate incidents
- Auto-resolve when condition clears

**Existing Infrastructure:**
- `AdminHealthService` already monitors services
- Extend with threshold checking and alert dispatch
- Background job (cron) for periodic checks

---

## Admin User Management

### Table Stakes

Features expected for managing admin users.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| List all admin users | See who has access | Low | Existing Admin entity |
| Invite new admin via email | Onboard team members | Medium | Email service, invite tokens |
| Admin accepts invite, sets password | Standard invite flow | Medium | Invite entity, auth flow |
| View admin profile/details | Basic user management | Low | Admin entity |
| Suspend admin account | Revoke access immediately | Low | Status field update |
| Reactivate admin account | Restore access | Low | Status field update |
| View admin's last login | Security visibility | Low | Existing lastLoginAt field |
| View admin's MFA status | Security compliance | Low | Existing mfaSetupComplete field |
| Reset admin's MFA | Recovery when device lost | Medium | MFA entity management |
| Admin activity log | Audit what admins do | Medium | Audit log infrastructure |

### Standard Flows

#### Admin Invite Flow

```
1. Super Admin enters invitee email + name + role
2. System checks email not already registered
3. System creates Admin record with status='invited'
4. System generates secure invite token (expires 72h)
5. System sends invite email with link
6. Invitee clicks link, validates token
7. Invitee sets password + MFA
8. Admin record updated: status='active'
9. Audit log: admin_invited, admin_accepted_invite
```

**Invite Email Content:**
- From: Nebula DNS Admin <no-reply@nebuladns.com>
- Subject: You've been invited to Nebula DNS Admin Dashboard
- Body: Welcome message, role description, link with token, expiry warning

**Invite Token:**
- Cryptographically random (32 bytes, hex encoded)
- Stored hashed in database (like password)
- Single use (invalidated on acceptance)
- 72-hour expiry
- Include role in invite record (not token) to prevent tampering

#### MFA Reset Flow

```
1. Super Admin selects admin to reset
2. System prompts for confirmation
3. System clears MFA secret and backup codes
4. Admin record: mfaSetupComplete=false, status='pending_mfa'
5. Audit log: admin_mfa_reset with actor
6. Next login, admin prompted to set up MFA again
```

**Security Considerations:**
- Require Super Admin to confirm action
- Log the reset with actor identification
- Consider requiring admin to verify identity before re-enabling MFA
- No "bypass MFA" option - reset forces new setup

#### Admin Activity Log Format

```typescript
interface AdminActivityLog {
  id: string;
  timestamp: Date;  // ISO 8601: 2026-01-19T14:23:45.123Z
  adminId: string;
  adminEmail: string;
  action: AdminAction;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
}

type AdminAction =
  | 'admin_login'
  | 'admin_logout'
  | 'admin_login_failed'
  | 'admin_invited'
  | 'admin_invite_accepted'
  | 'admin_suspended'
  | 'admin_reactivated'
  | 'admin_role_changed'
  | 'admin_mfa_reset'
  | 'impersonation_started'
  | 'impersonation_ended'
  | 'msp_created'
  | 'billing_adjustment'
  | 'alert_acknowledged'
  | 'alert_config_changed';
```

**What to Log (Required):**
- All authentication events (login, logout, failures)
- Admin management actions (invite, suspend, role change)
- Sensitive operations (impersonation, billing changes)
- Security-relevant changes (MFA reset, alert config)

**What NOT to Log:**
- Read-only page views (too noisy)
- Search queries (privacy concern)
- API health checks (too frequent)

### Activity Log UI Requirements

| Feature | Description | Priority |
|---------|-------------|----------|
| Filterable by admin | See one admin's activity | High |
| Filterable by action type | See all impersonations | High |
| Filterable by date range | Time-bounded queries | High |
| Searchable by resource | Find activity on specific MSP | Medium |
| Exportable to CSV | Compliance/audit needs | Medium |
| Real-time updates | Auto-refresh for monitoring | Low |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Invite expiry reminder email | Nudge pending invites | Low | Nice UX touch |
| Bulk admin operations | Manage multiple at once | Medium | Low volume - not needed |
| Admin profile photo | Personalization | Low | Nice but not essential |
| Session location display | Security visibility | Low | Use IP geolocation |
| Force password change | Security policy | Medium | MFA more important |
| Admin groups | Organize admins | High | 2-5 admins don't need groups |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Self-service role requests | Security workflow complexity | Super Admin assigns directly |
| Public admin directory | Privacy/security concern | Internal list only |
| Admin-to-admin messaging | Use Slack | External communication tools |
| Password policy configuration | Default strong policy | Enforce minimum 12 chars, no expiry per NIST |
| Admin API tokens | UI is primary interface | Admin uses dashboard directly |
| Delegate invite permission | Too granular | Only Super Admin invites |

### Implementation Notes

**Admin Entity Updates:**
```typescript
// Add to Admin entity
@Column({ type: 'varchar', length: 20, default: 'admin' })
role: 'super_admin' | 'admin' | 'viewer';

@Column({ name: 'invite_token_hash', type: 'varchar', nullable: true })
@Exclude()
inviteTokenHash: string | null;

@Column({ name: 'invite_expires_at', type: 'timestamp', nullable: true })
inviteExpiresAt: Date | null;
```

**New Entity: AdminActivityLog**
```typescript
@Entity('admin_activity_logs')
export class AdminActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 50, nullable: true })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string;

  @Column({ name: 'resource_name', type: 'varchar', length: 255, nullable: true })
  resourceName: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
```

**Existing Infrastructure:**
- `AuditLogsService` exists but is tenant-scoped
- Create separate `AdminActivityLogService` for admin-specific logging
- Or extend existing service with admin context detection

---

## Feature Dependencies

### Dependency Graph

```
RBAC (Phase 1)
  |
  +-- Role column on Admin entity
  |
  +-- AdminRolesGuard
  |
  +-- Role-based UI filtering
  |
  v
Admin User Management (Phase 2)
  |
  +-- Depends on RBAC for permission checks
  |
  +-- Admin invite flow
  |
  +-- MFA management
  |
  +-- Activity logging
  |
  v
Alerting Integrations (Phase 3)
  |
  +-- Depends on RBAC for config permissions
  |
  +-- Extends Admin activity logging
  |
  +-- Uses existing health monitoring
```

### Recommended Phase Order

1. **RBAC First** - Foundation for permission checking in all other features
2. **Admin User Management Second** - Depends on roles for invite permissions
3. **Alerting Integrations Third** - Uses role checks for configuration access

---

## Complexity Summary

| Feature Category | Table Stakes Count | Total Complexity | Estimated Effort |
|------------------|-------------------|------------------|------------------|
| RBAC | 8 features | Low-Medium | 1-2 sprints |
| Alerting | 6 features | Medium | 1-2 sprints |
| Admin Management | 10 features | Medium | 2 sprints |
| **Total** | **24 features** | | **4-6 sprints** |

---

## Sources

### RBAC Best Practices
- [How to Design an RBAC System - NocoBase](https://www.nocobase.com/en/blog/how-to-design-rbac-role-based-access-control-system)
- [10 RBAC Best Practices for 2025 - Oso](https://www.osohq.com/learn/rbac-best-practices)
- [Role-Based Access Control Guide - StrongDM](https://www.strongdm.com/rbac)
- [RBAC Best Practices - TechPrescient](https://www.techprescient.com/blogs/role-based-access-control-best-practices/)

### Permission Matrix Patterns
- [Dell Roles & Permissions Matrix](https://i.dell.com/sites/doccontent/app-merchandizing/esupport/flatcontent/global/en/Documents/RoleDetails.pdf)
- [Best Practices for Managing Users, Roles, and Permissions - DEV Community](https://dev.to/anna_p_s/best-practices-for-managing-users-roles-and-permissions-5140)
- [LabKey Administrator Permissions Matrix](https://www.labkey.org/Documentation/wiki-page.view?name=adminPermMatrix)

### Alerting Integrations
- [PagerDuty Slack Integration Guide](https://support.pagerduty.com/main/docs/slack-integration-guide)
- [Best Practices for Alerting Using PagerDuty - DrDroid](https://drdroid.io/engineering-tools/best-practices-for-alerting-using-pagerduty)
- [IT Alerting Guide - Atlassian](https://www.atlassian.com/incident-management/on-call/it-alerting)
- [Monitoring and Alerting Best Practices - TechTarget](https://www.techtarget.com/searchitoperations/tip/4-monitoring-and-alerting-best-practices-for-IT-ops)
- [Network Monitoring Alerts Best Practices - Kentik](https://www.kentik.com/kentipedia/network-monitoring-alerts/)

### Admin User Management & MFA
- [Reset MFA for Microsoft 365 Users - AdminDroid](https://blog.admindroid.com/reset-mfa-for-microsoft-365-users/)
- [Remove or Change Dashboard MFA - Auth0](https://auth0.com/docs/get-started/manage-dashboard-access/add-change-remove-mfa/remove-or-change-dashboard-multi-factor-authentication)
- [MFA Best Practices - 917 Solutions](https://917solutions.com/mfa-best-practices-microsoft-365-setup-guide-step-5-5/)

### Activity Logging & Audit Trails
- [Guide to Building Audit Logs - Medium](https://medium.com/@tony.infisical/guide-to-building-audit-logs-for-application-software-b0083bb58604)
- [Audit Logging Best Practices - CertPro](https://certpro.com/audit-log-security-best-practices/)
- [Audit Logging Guide - Middleware.io](https://middleware.io/blog/audit-logs/)
- [Microsoft Entra Audit Log Reference](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities)

### JWT & Authentication
- [JWT Security Best Practices 2025 - JWT.app](https://jwt.app/blog/jwt-best-practices/)
- [Token Best Practices - Auth0](https://auth0.com/docs/secure/tokens/token-best-practices)
- [JWT Best Practices - Curity](https://curity.io/resources/learn/jwt-best-practices/)
