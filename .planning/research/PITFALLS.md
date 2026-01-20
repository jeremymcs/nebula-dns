# Pitfalls Research: v1.2
# Nebula DNS Admin Dashboard - RBAC, Alerting, Admin Management
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Domain:** Internal ops dashboard enhancement
**Researched:** 2026-01-19
**Context:** Adding role-based access, alerting integrations, and admin user management to existing Mission Control admin dashboard

## Executive Summary

Adding RBAC, alerting, and admin management to an existing production system presents unique risks distinct from greenfield implementations. The primary dangers are:
1. **Self-lockout scenarios** where existing admins lose access during migration
2. **Alert fatigue and misconfiguration** causing missed critical issues or noise overwhelming the ops team
3. **Permission gaps** where new role structure doesn't map cleanly to existing usage patterns

This research identified 18 specific pitfalls across four categories with actionable prevention strategies.

---

## RBAC Pitfalls

### P-RBAC-01: Admin Self-Lockout During Migration

**Description:** When transitioning from "all admins equal" to tiered roles, existing admins can accidentally lose access to critical functions. The first admin to apply RBAC changes may inadvertently lock themselves (and everyone else) out of admin management functions.

**Warning Signs:**
- No "break glass" super admin account exists before migration
- Role assignment logic runs before verifying at least one Super Admin exists
- Migration script doesn't have rollback capability
- Testing only done in development where admin access differs

**Prevention:**
1. Create a separate "break glass" Super Admin account with MFA before any migration
2. Store break glass credentials in secure vault (e.g., 1Password, HashiCorp Vault)
3. Add database constraint: `CHECK (COUNT(*) >= 1 WHERE role = 'super_admin')` or equivalent application-level validation
4. Migration script should verify Super Admin count both pre- and post-migration
5. Test migration against production database copy, not just dev fixtures

**Phase Impact:** Phase 1 (Role Infrastructure) - Must be addressed before any role assignment logic is implemented

**Specific to Nebula:** Current `Admin` entity has no `role` field. Migration must:
- Add role column with default `'admin'` to preserve current access
- Explicitly promote at least one admin to `'super_admin'` before enabling role checks
- AdminAuthGuard must gracefully handle admins without role (treat as full access during migration window)

---

### P-RBAC-02: Role Explosion / Over-Granularity

**Description:** Creating too many fine-grained roles (e.g., "BillingViewer", "BillingEditor", "BillingAdmin", "TenantBillingViewer"...) makes the system unmanageable. With only 3 planned roles (Super Admin, Admin, Viewer), this seems low-risk, but scope creep during implementation often leads to "just one more role" additions.

**Warning Signs:**
- Requirements specify more than 5 distinct roles
- Each new feature requests its own role
- Permission matrix becomes difficult to maintain
- Role names become increasingly specific to features rather than job functions

**Prevention:**
1. Lock in the three-role structure (Super Admin, Admin, Viewer) in design docs
2. Use feature flags or explicit permission checks for sub-role granularity, not new roles
3. Document the escalation path: if someone needs access outside their role, they get promoted, not a new role created
4. Quarterly role audit to ensure role count hasn't grown

**Phase Impact:** Phase 1 (Role Infrastructure) - Define clear role boundaries upfront

**Specific to Nebula:** The existing tenant RBAC has 5 roles (`owner`, `admin`, `analyst`, `readonly`, `member`). Don't mirror this complexity in admin RBAC. Admin dashboard has simpler needs.

---

### P-RBAC-03: Inconsistent Permission Enforcement

**Description:** Permissions enforced in UI but not API, or vice versa. Attackers (or curious users) bypass UI restrictions by calling API directly. Common when RBAC is retrofitted to existing endpoints.

**Warning Signs:**
- UI shows/hides buttons but API accepts requests from any authenticated admin
- Permission checks scattered throughout controllers instead of centralized guard
- Test coverage focuses on happy path, not authorization rejection
- Different permission logic in frontend vs backend

**Prevention:**
1. Single source of truth: `AdminRolesGuard` decorator on all protected endpoints
2. Permission definitions in shared location imported by both API and UI
3. E2E tests that verify 403 responses for unauthorized role attempts
4. Audit all existing `/admin/*` endpoints - current controller has 20+ endpoints, all need role evaluation

**Phase Impact:** Phase 1 (Role Infrastructure) - Build centralized enforcement before adding any new endpoints

**Specific to Nebula:** Current `AdminAuthGuard` only checks authentication, not authorization. Need new `AdminRolesGuard` that checks both. Example pattern from existing tenant RBAC:
```typescript
// Existing pattern in roles.guard.ts - adapt for admin roles
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
@UseGuards(AdminAuthGuard, AdminRolesGuard)
```

---

### P-RBAC-04: Role Creep / Privilege Accumulation

**Description:** Over time, admins accumulate permissions they no longer need. An admin who was temporarily promoted to Super Admin for a migration might remain Super Admin indefinitely.

**Warning Signs:**
- No visibility into when/why roles were assigned
- No periodic access review process
- Audit logs don't capture role changes
- More Super Admins than expected after 6 months

**Prevention:**
1. Log all role changes to audit log with reason field
2. Admin activity dashboard showing role assignments over time
3. Quarterly role review reminder in admin dashboard
4. Consider role expiration for temporary elevations (optional enhancement)

**Phase Impact:** Phase 3 (Admin User Management) - Build audit trail from the start

**Specific to Nebula:** Leverage existing `AuditLogsService` with hash chain integrity. Add new resource type `'admin_role'` and actions `'role_grant'`, `'role_revoke'`.

---

### P-RBAC-05: Viewer Role with Hidden Write Access

**Description:** "Viewer" role inadvertently gains write access through overlooked endpoints. Session management, export functions, or "benign" actions may have side effects.

**Warning Signs:**
- Viewer can trigger exports (creates files, hits external APIs)
- Viewer can "test" webhooks (sends data to external systems)
- Viewer can view pages that trigger lazy data generation
- Viewer can impersonate tenants (current `/admin/impersonate` endpoint)

**Prevention:**
1. Explicit endpoint audit: categorize every `/admin/*` endpoint as read/write
2. Viewer role: NO access to impersonation, billing modifications, user management, system actions
3. Even "read" operations that have side effects (logging user viewed X) should be documented
4. Test: Viewer token should receive 403 on all write endpoints

**Phase Impact:** Phase 1 (Role Infrastructure) - Audit must happen during design, not after implementation

**Specific to Nebula:** Critical endpoints to restrict from Viewer:
- `POST /admin/impersonate/:tenantId` - absolutely Super Admin only
- `POST /admin/msp/tenants` - Super Admin only
- All `/admin/tenants/:tenantId/billing/*` write operations - Super Admin only
- `POST /admin/sessions/revoke-all` - Admin's own sessions only

---

## Alerting Pitfalls

### P-ALERT-01: Webhook URL Hardcoded or Improperly Secured

**Description:** Slack/PagerDuty webhook URLs embedded in code, environment variables exposed in logs, or URLs accessible without authentication. Anyone with the URL can post to your channels.

**Warning Signs:**
- Webhook URLs visible in frontend code
- URLs logged in debug output
- URLs stored in unencrypted database fields
- No rotation mechanism for compromised URLs

**Prevention:**
1. Store webhook URLs encrypted at rest (use existing `encrypt()` utility)
2. Never log webhook URLs, even in debug mode
3. Implement URL rotation: ability to update URLs without code deployment
4. Validate webhook URL format before saving (Slack: `hooks.slack.com`, PagerDuty: `events.pagerduty.com`)

**Phase Impact:** Phase 2 (Alerting Integrations) - Security requirements before feature implementation

**Specific to Nebula:** Follow existing `WebhooksService` pattern which stores `secretHash` but NOT the webhook URLs encrypted. For alerting integrations, URLs should be encrypted using the same `MFA_ENCRYPTION_KEY` infrastructure.

---

### P-ALERT-02: Alert Fatigue from Verbose Configuration

**Description:** Initial alert configuration too sensitive, generating dozens of alerts daily. Team starts ignoring alerts, misses critical issues. "Alert fatigue" is the #1 cause of missed incidents.

**Warning Signs:**
- More than 10 alerts per day to a channel
- Same alert type appears repeatedly
- Alerts for events that don't require action
- Team members muting notification channels

**Prevention:**
1. Start with minimal alerting: critical failures only (service down, data corruption, security breach)
2. Add alerting incrementally based on actual incidents
3. Every alert must have a documented response action - if no action needed, it's not an alert
4. Implement alert grouping/deduplication (PagerDuty handles this natively)
5. Different severity levels: Slack for informational, PagerDuty for actionable

**Phase Impact:** Phase 2 (Alerting Integrations) - Configure conservatively at launch, expand based on feedback

**Specific to Nebula:** Initial alert categories to implement:
- CRITICAL (PagerDuty): Admin account lockout, MFA bypass attempt, database connection failure
- WARNING (Slack): New MSP tenant created, admin login from new IP, system health degradation
- NOT ALERTS: Individual tenant actions, routine operations, successful deployments

---

### P-ALERT-03: PagerDuty Deduplication Key Mismanagement

**Description:** Each incident type needs consistent `dedup_key`. Without it, the same underlying issue creates multiple incidents. With wrong key format, related alerts aren't grouped. Resolve events with mismatched keys are silently dropped.

**Warning Signs:**
- Same system issue creates 5+ PagerDuty incidents
- Manual incident merging required frequently
- Auto-resolve not working (incidents stay open)
- Incident count much higher than actual issue count

**Prevention:**
1. Define `dedup_key` format upfront: `{service}.{component}.{issue_type}` (e.g., `nebula-admin.auth.lockout`)
2. Document key format so all alerting code uses consistent pattern
3. Test resolve events - verify they actually close incidents
4. Log `dedup_key` in audit trail so debugging is possible

**Phase Impact:** Phase 2 (Alerting Integrations) - Define key format before implementing any alerts

**Specific to Nebula:** Example dedup keys:
- `nebula-admin.auth.admin-locked:{admin_id}` - lockout per admin
- `nebula-admin.health.database-degraded` - single incident for DB issues
- `nebula-admin.health.policy-service-down` - single incident for policy service

---

### P-ALERT-04: Missing Test/Verify Functionality

**Description:** No way to test alerting configuration without triggering real alerts. Admins configure integration, assume it works, discover it's broken during actual incident.

**Warning Signs:**
- No "Send Test Alert" button in UI
- Testing requires creating fake incidents
- Configuration changes aren't validated before save
- First indication of broken alerting is missed real incident

**Prevention:**
1. Implement "Test Integration" endpoint that sends clearly-marked test messages
2. Validate API connectivity on save (hit Slack/PagerDuty API, verify 200 response)
3. Test messages should include "[TEST]" prefix and not trigger PagerDuty escalation
4. Log test results for debugging

**Phase Impact:** Phase 2 (Alerting Integrations) - Test functionality is table stakes

**Specific to Nebula:** Follow existing `WebhooksService.test()` pattern which sends test payload with `test: true` flag. For Slack, use message with `[TEST]` prefix. For PagerDuty, use severity `info` which doesn't page.

---

### P-ALERT-05: Slack Rate Limiting Ignored

**Description:** Burst of alerts overwhelms Slack rate limits (1 message per second per webhook). Messages dropped silently, critical alerts may be lost.

**Warning Signs:**
- Gap in alert history during high-activity periods
- Slack API returning 429 responses (not logged)
- Alert count in system doesn't match Slack message count
- Burst scenarios (system restart, mass update) missing alerts

**Prevention:**
1. Implement rate limiting on sender side (token bucket, 1 msg/sec)
2. Queue alerts during bursts, deliver with backoff
3. Log rate limit events (even if message is queued)
4. For high-volume scenarios, aggregate alerts: "15 tenants updated in last 5 minutes" vs 15 individual messages

**Phase Impact:** Phase 2 (Alerting Integrations) - Build rate limiting into alerting service from start

**Specific to Nebula:** Existing `WebhooksService` has `checkRateLimit()` method - adapt this pattern for alerting. Use same Redis-based rate limiting infrastructure.

---

## Admin Management Pitfalls

### P-ADMIN-01: Invite Flow Without Expiration

**Description:** Admin invites remain valid indefinitely. Old invites discovered and used months later, potentially by wrong person. Email addresses change hands, invites go to unintended recipients.

**Warning Signs:**
- No expiration field on invite records
- Invites from 6+ months ago still usable
- No visibility into pending invites
- Invite links work after admin account deleted

**Prevention:**
1. Default 7-day invite expiration, configurable up to 30 days
2. Dashboard showing pending invites with expiration times
3. Ability to revoke individual invites
4. Automatic cleanup job for expired invites

**Phase Impact:** Phase 3 (Admin User Management) - Build expiration into invite model from start

**Specific to Nebula:** Current Admin entity has `invitedByAdminId` but no invite tracking table. Need new `AdminInvite` entity with: `id`, `email`, `role`, `invitedByAdminId`, `expiresAt`, `acceptedAt`, `token` (hashed).

---

### P-ADMIN-02: Self-Service Role Escalation

**Description:** Admin can change their own role, potentially escalating to Super Admin. Even if UI prevents it, API might allow it.

**Warning Signs:**
- No explicit check for "can't modify own role"
- Test cases don't cover self-modification
- API accepts `adminId` in request body for "update admin" endpoint
- No audit trail for who changed whose role

**Prevention:**
1. Explicit check: `if (targetAdminId === currentAdminId) throw Forbidden`
2. Role changes require different admin (Super Admin only)
3. Add audit log entry with both actor and target admin IDs
4. E2E test: admin attempts self-promotion, receives 403

**Phase Impact:** Phase 3 (Admin User Management) - Build constraint into role change endpoint

**Specific to Nebula:** When implementing `PATCH /admin/admins/:adminId/role`, add:
```typescript
if (admin.adminId === targetAdminId) {
  throw new ForbiddenException('Cannot modify your own role');
}
```

---

### P-ADMIN-03: MFA Reset Without Verification

**Description:** Admin can reset another admin's MFA without verification, creating vector for account takeover. Attacker compromises Admin account, resets Super Admin MFA, logs in as Super Admin.

**Warning Signs:**
- MFA reset only requires current admin authentication
- No secondary verification (email confirmation, waiting period)
- No notification to the admin whose MFA is being reset
- No audit trail for MFA resets

**Prevention:**
1. MFA reset for others requires Super Admin role
2. Send email notification to target admin when MFA is reset
3. Optional: 24-hour delay on MFA reset unless target admin confirms via email
4. Audit log all MFA management actions

**Phase Impact:** Phase 3 (Admin User Management) - Security requirement for MFA management

**Specific to Nebula:** Current MFA service (`MfaService`) is user-tenant scoped. Admin MFA lives separately in `admin-mfa.entity.ts`. Admin MFA reset should:
1. Require Super Admin
2. Email notification to target admin
3. New audit action type: `'admin_mfa_reset'`

---

### P-ADMIN-04: Activity Logs Missing Context

**Description:** Activity logs record "what" but not "why" or "from where". During incident investigation, insufficient context makes it impossible to understand attack timeline.

**Warning Signs:**
- Logs contain action but not IP address
- No user agent / device information
- Timestamps in local time (not UTC)
- No correlation ID for related events

**Prevention:**
1. Every log entry: `adminId`, `action`, `targetResource`, `ipAddress`, `userAgent`, `timestamp (UTC)`
2. Session tracking: which JWT was used for action
3. Correlation ID for multi-step operations
4. Geolocation for IP (optional but useful)

**Phase Impact:** Phase 3 (Admin User Management) - Build comprehensive logging schema from start

**Specific to Nebula:** Existing `AuditLogsService` already captures `ipAddress`, `userAgent`, `metadata`. Extend for admin actions with:
- Add `sessionId` or `jti` to track which session performed action
- Add `adminId` field (separate from `userId` which is tenant-scoped)
- Consider ClickHouse for high-volume admin activity analytics

---

### P-ADMIN-05: Password Policy Bypass

**Description:** Admin password requirements not enforced consistently. Password set during invite acceptance, reset, or update might skip validation. Weak passwords on privileged accounts.

**Warning Signs:**
- Different password validation in different flows (signup vs reset vs change)
- Password requirements not documented
- No password strength indicator in UI
- Existing admins have passwords from before strict policy

**Prevention:**
1. Single password validation function used everywhere
2. Document requirements: minimum 14 chars, mixed case, numbers, symbols (existing standard)
3. Force password change for accounts with pre-policy passwords
4. Audit: query for admins who haven't changed password in 90+ days

**Phase Impact:** Phase 3 (Admin User Management) - Enforce from day 1 of admin management

**Specific to Nebula:** Current `AdminLoginDto` has:
```typescript
@MinLength(14)
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*$/)
```
Ensure same validation in any new password-setting endpoints (invite acceptance, password reset, password change).

---

## Migration Pitfalls

### P-MIG-01: Big Bang Deployment

**Description:** All RBAC changes deployed at once. If anything breaks, rollback affects everything. Users experience sudden permission changes without warning.

**Warning Signs:**
- Single deployment enables RBAC for all admins
- No gradual rollout plan
- No feature flag for RBAC enforcement
- Rollback plan is "redeploy previous version"

**Prevention:**
1. Feature flag: `ADMIN_RBAC_ENABLED=false` initially
2. Shadow mode: log what RBAC would deny without actually denying
3. Gradual rollout: enable for single admin, then team, then all
4. Communication: email admins 1 week before enforcement starts
5. Rollback plan: disable flag, not code rollback

**Phase Impact:** Phase 4 (Migration & Rollout) - Plan for gradual rollout from start

**Specific to Nebula:** Add to `ConfigService`:
```typescript
ADMIN_RBAC_ENABLED: boolean (default false)
ADMIN_RBAC_SHADOW_MODE: boolean (default true during rollout)
```

---

### P-MIG-02: Missing Permission Mapping

**Description:** Current admin actions not mapped to new role structure. After migration, admins find they can't perform actions they could before, even though they have "appropriate" role.

**Warning Signs:**
- No documentation of current admin permissions
- Role definitions written without analyzing existing usage
- First week after deployment has constant "I can't do X" complaints
- Rapid role escalations to Super Admin to "fix" access issues

**Prevention:**
1. Document all current admin endpoints with required permissions
2. Create permission matrix: endpoint x role = allow/deny
3. Test matrix against actual admin usage patterns
4. Viewer role should cover everything non-Super-Admins currently do read-wise

**Phase Impact:** Phase 1 (Role Infrastructure) - Mapping exercise before implementation

**Specific to Nebula:** Current `/admin/*` endpoints (from controller analysis):
| Endpoint | Current: All Admins | Proposed Role |
|----------|---------------------|---------------|
| GET /admin/tenants/search | Yes | All |
| POST /admin/msp/tenants | Yes | Super Admin |
| GET /admin/msp/tenants | Yes | All |
| GET /admin/msp/tenants/:id | Yes | All |
| POST /admin/impersonate/:id | Yes | Super Admin |
| All billing write operations | Yes | Super Admin |
| GET billing/subscription | Yes | All |
| GET system/health | Yes | All |

---

### P-MIG-03: Breaking API Consumers

**Description:** External scripts, monitoring tools, or integrations using admin API break when roles are enforced. Service accounts may not have proper role assignments.

**Warning Signs:**
- No inventory of API consumers
- API tokens not associated with role-aware accounts
- Health checks fail after RBAC deployment
- Automated processes start failing silently

**Prevention:**
1. Inventory all service accounts using admin API
2. Assign appropriate roles to service accounts before enforcement
3. Add `X-Required-Role` response header during shadow mode to warn consumers
4. Monitor for increased 403 responses after deployment

**Phase Impact:** Phase 4 (Migration & Rollout) - Service account audit before enforcement

**Specific to Nebula:** Check for any:
- Monitoring systems hitting `/admin/system/health`
- Scripts using admin token for MSP tenant creation
- CI/CD using admin API for testing

---

### P-MIG-04: Database Migration Without Backups

**Description:** Schema migration to add role column fails or corrupts data. No backup means extended outage or data loss.

**Warning Signs:**
- Migration runs against production without testing against prod-like data
- No database backup before migration
- Migration lacks `down()` method for rollback
- Large table migration without considering lock time

**Prevention:**
1. Backup database before migration
2. Test migration against production data copy
3. Migration must have working `down()` method
4. For large tables, use online schema change techniques
5. Schedule migration during low-traffic window

**Phase Impact:** Phase 1 (Role Infrastructure) - Migration safety before any schema changes

**Specific to Nebula:** `Admin` table is small (likely <100 rows), so migration risk is low. Still:
1. Take snapshot before
2. Test `down()` migration in staging
3. Migration SQL:
```sql
ALTER TABLE admins ADD COLUMN role VARCHAR(20) DEFAULT 'admin';
UPDATE admins SET role = 'super_admin' WHERE id = '[designated-super-admin-id]';
```

---

## Pitfall Priority Matrix

| ID | Pitfall | Severity | Likelihood | Phase |
|----|---------|----------|------------|-------|
| P-RBAC-01 | Admin Self-Lockout | CRITICAL | High | 1 |
| P-RBAC-03 | Inconsistent Permission Enforcement | HIGH | High | 1 |
| P-MIG-01 | Big Bang Deployment | HIGH | Medium | 4 |
| P-ALERT-02 | Alert Fatigue | HIGH | High | 2 |
| P-ADMIN-02 | Self-Service Role Escalation | HIGH | Medium | 3 |
| P-ADMIN-03 | MFA Reset Without Verification | HIGH | Medium | 3 |
| P-RBAC-05 | Viewer Role with Hidden Write Access | MEDIUM | High | 1 |
| P-ALERT-03 | PagerDuty Deduplication | MEDIUM | High | 2 |
| P-ADMIN-01 | Invite Flow Without Expiration | MEDIUM | Medium | 3 |
| P-MIG-02 | Missing Permission Mapping | MEDIUM | High | 1 |
| P-RBAC-02 | Role Explosion | LOW | Low | 1 |
| P-RBAC-04 | Role Creep | LOW | Medium | 3 |
| P-ALERT-01 | Webhook URL Security | LOW | Low | 2 |
| P-ALERT-04 | Missing Test Functionality | LOW | High | 2 |
| P-ALERT-05 | Slack Rate Limiting | LOW | Medium | 2 |
| P-ADMIN-04 | Activity Logs Missing Context | LOW | Medium | 3 |
| P-ADMIN-05 | Password Policy Bypass | LOW | Low | 3 |
| P-MIG-03 | Breaking API Consumers | MEDIUM | Low | 4 |
| P-MIG-04 | Database Migration Without Backups | LOW | Low | 1 |

---

## Sources

### RBAC Best Practices
- [10 RBAC Best Practices - Oso](https://www.osohq.com/learn/rbac-best-practices)
- [6 Common RBAC Implementation Pitfalls - Idenhaus](https://idenhaus.com/rbac-implementation-pitfalls/)
- [8 Role Based Access Control Best Practices for 2025 - CloudToggle](https://www.cloudtoggle.com/blog-en/role-based-access-control-best-practices/)
- [Common Challenges in RBAC Implementation - Censinet](https://www.censinet.com/perspectives/common-challenges-role-based-access-control-implementation)
- [Plan your Grafana RBAC rollout strategy - Grafana](https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/plan-rbac-rollout-strategy/)

### Alerting Integration
- [How to Troubleshoot Slack Integration Issues - QuestionBase](https://www.questionbase.com/resources/blog/troubleshoot-slack-integration-issues)
- [Sending messages using incoming webhooks - Slack API](https://api.slack.com/messaging/webhooks)
- [Advanced Troubleshooting Guide for PagerDuty - Mindful Chase](https://www.mindfulchase.com/explore/troubleshooting-tips/devops-tools/advanced-troubleshooting-guide-for-pagerduty.html)
- [PagerDuty API Essentials - Zuplo](https://zuplo.com/blog/2025/05/05/pagerduty-api)
- [Alerts - PagerDuty Support](https://support.pagerduty.com/main/docs/alerts)

### Admin User Management
- [Top 8 Privileged Users Mistakes - Syteca](https://www.syteca.com/en/blog/inadvertent-privileged-user-mistakes)
- [Active Directory Management: Top 7 Common Mistakes - Netwrix](https://blog.netwrix.com/2017/11/22/active-directory-management-top-7-common-mistakes)
- [Key IAM Best Practices in 2025 - Rippling](https://www.rippling.com/blog/iam-best-practices)
- [The Top 6 User Access Control Challenges of 2025 - Stitchflow](https://www.stitchflow.com/blog/user-access-control-challenges)
- [Guide to Account Lockout Best Practices - Netwrix](https://www.netwrix.com/account_lockout_best_practices.html)
