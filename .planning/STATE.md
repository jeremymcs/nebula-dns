# Project State

// Nebula DNS Admin Dashboard - Project State
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Enable ops team to manage MSPs entirely through the UI — with proper role separation and proactive alerting.
**Current focus:** v1.2 Admin Roles & Alerting

## Current Position

Phase: 23 - Migration & Rollout
Plan: Complete (4/4 plans)
Status: Phase verified
Last activity: 2026-02-02 — Phase 23 complete, all success criteria verified

Progress: [█████████████████████] 100% (37/37 requirements addressed)

## Milestone v1.2 Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 17 | RBAC Foundation (Backend) | 8 | Complete (4/4 plans) |
| 18 | RBAC UI | 2 | Complete (2/2 plans) |
| 19 | Admin User Management (Backend) | 12 | Complete (7/7 plans) |
| 20 | Admin User Management (UI) | 0* | Complete (6/6 plans) |
| 21 | Alerting Integrations (Backend) | 10 | Complete (5/5 plans) |
| 22 | Alerting Configuration (UI) | 0* | Complete (3/3 plans) |
| 23 | Migration & Rollout | 5 | Complete (4/4 plans) |

*UI phases implement frontend for requirements assigned to backend phases.

**Total:** 7 phases, 37 requirements — ALL COMPLETE

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
| AdminActivityService exported from AdminModule | Other services can use it for activity logging | 19-03 |
| Activity query uses LEFT JOINs for null targets | Gracefully handles actions without targetAdmin | 19-03 |
| getActivityForAdmin filters actor OR target | Shows complete audit trail for individual admin | 19-03 |
| Admin invite email uses gradient header | Matches existing email patterns for brand consistency | 19-04 |
| MFA reset email uses warning colors | Yellow/amber styling highlights security action | 19-04 |
| Role display formatting in emails | Converts super_admin to Super Admin for readability | 19-04 |
| Cannot suspend yourself | Prevents accidental self-lockout | 19-05 |
| Cannot suspend another super_admin | Must demote to admin first to prevent privilege escalation | 19-05 |
| Cannot reset own MFA through admin service | Must use self-service (requires working MFA to be logged in) | 19-05 |
| Reactivation status depends on MFA state | Sets to pending_mfa if MFA not complete, active if complete | 19-05 |
| MFA reset email failure does not block operation | Logged as warning, operation succeeds anyway (availability over notification) | 19-05 |
| Store only SHA256 hashes of invitation tokens | Limits exposure if database is compromised | 19-06 |
| setImmediate for activity logging in transaction | Prevents activity log from blocking transaction commit | 19-06 |
| Email sending failures logged but don't block invitation | Allows retry or manual notification | 19-06 |
| Expired invitations marked on acceptance attempt | Simpler than background job, expiry check when token used | 19-06 |
| All endpoints except accept-invite require SUPER_ADMIN role | User management is sensitive; only super admins should manage other admins | 19-07 |
| Accept invitation is public (no authentication) | Invited users don't have credentials yet; use token-based validation instead | 19-07 |
| IP address extracted from headers for audit logging | Capture real client IP when behind proxy/load balancer for security audit | 19-07 |
| Re-export AdminRole from admin-permissions.ts | Avoids type duplication while making AdminRole available from types/admin-users.ts | 20-01 |
| acceptAdminInvitation uses fetch without auth header | Correctly implements public endpoint as designed in backend | 20-01 |
| useAdminUserDetail accepts null adminId | Enables conditional fetching when detail view not selected | 20-01 |
| Zod v4 uses message param instead of errorMap for enum validation | Breaking change in Zod v4 API | 20-02 |
| Default role in invite form is 'admin' | Matches backend default, security-conscious starting point | 20-02 |
| Role descriptions shown inline below select | Helps users understand permission levels without separate help modal | 20-02 |
| Custom formatTimeAgo without date-fns | Package not in admin-ui dependencies, native Date API sufficient | 20-03 |
| Filter invites to status=pending before display | Only show actionable invitations, not accepted/revoked/expired | 20-03 |
| Expiry countdown in days/hours/minutes | More informative than raw date for time-sensitive invitations | 20-03 |
| Timeline-style vertical layout for activity entries | Visual line connecting entries creates clear chronological flow | 20-04 |
| Color-coded icons by action category | Auth (accent), Positive (success), Negative (danger), Neutral (warning) | 20-04 |
| Modal with xl size for drawer appearance | Provides sufficient width for profile and activity display | 20-04 |
| Conditional action buttons based on status | Suspend shown for non-suspended, Reactivate shown for suspended | 20-04 |
| All management actions require confirmation | Prevents accidental destructive operations | 20-04 |
| Suspense wrapper for useSearchParams | Next.js 14 requires Suspense boundary for client-side URL params | 20-06 |
| PASSWORD_REQUIREMENTS array for real-time checking | Provides structured requirement data for UI feedback | 20-06 |
| 3-second countdown before redirect on success | Gives user feedback before automatic redirect | 20-06 |
| Users page uses useRequireFeature('admin-users') for route protection | Consistent with other feature-gated pages | 20-05 |
| Separate mutate calls for admins and invitations data refresh | Different API endpoints require separate SWR cache invalidation | 20-05 |
| Navigation item uses 'admin-users' feature key matching ADMIN_PERMISSIONS | Leverages existing role-based filtering infrastructure | 20-05 |
| Slack webhook URLs validated to start with https://hooks.slack.com/ | Prevents misconfiguration with invalid webhook URLs | 21-01 |
| PagerDuty routing keys validated to be exactly 32 characters | Matches PagerDuty Events API v2 integration key format | 21-01 |
| Default severity filter: [critical, error] excluding warnings | Excludes warnings from critical channels (aligns with ALERT-07) | 21-01 |
| Event types default to [] (empty array = all event types) | Allows optional filtering by system_health, billing, security | 21-01 |
| Followed SIEM integration entity pattern for encrypted config storage | Uses encrypted JSONB column for sensitive credentials | 21-01 |
| Used SIEM encryption pattern for alert credentials | deriveKey with 'alerting-gcm-salt' for consistency across codebase | 21-02 |
| Auto-disable configs after 10 consecutive failures | Circuit breaker prevents runaway error loops, manual re-enable required | 21-02 |
| Response DTOs exclude encrypted data for security | toResponseDto prevents credential leakage, getDecryptedConfig is internal | 21-02 |
| PagerDuty routing keys validated as exactly 32 characters | Integration key format per PagerDuty API standard | 21-04 |
| Warning severity alerts skipped for PagerDuty (ALERT-07) | PagerDuty for critical/error only, warnings go to Slack | 21-04 |
| Dedup key format: nebuladns:{source}:{type}:{identifier} | Prevents incident explosion by grouping related alerts | 21-04 |
| Test alert creates and immediately resolves incident (ALERT-09) | Verifies connectivity without leaving open test incidents | 21-04 |
| Summary field truncated to 1024 chars | PagerDuty API limit for summary field | 21-04 |
| Validation on alert config creation | Slack webhookUrl prefix and PagerDuty routingKey length validated upfront | 21-02 |
| AlertDispatcherService uses @Optional injection | Services work without alerting configured, no hard dependencies | 21-05 |
| Health alerts use 5-minute cooldown per status | Prevents alert spam for flapping services | 21-05 |
| Impersonation tracking uses in-memory Map with 1-hour windows | 3+ impersonations triggers warning, simpler than database queries | 21-05 |
| Payment alerts prepared but require webhook handler integration | PaymentsService has handlePaymentFailure() ready for webhook processing | 21-05 |
| All event sources use optional alerting | @Optional() decorator prevents circular dependencies | 21-05 |
| Types use string for dates (not Date) matching JSON serialization | Frontend types mirror JSON response format | 22-01 |
| Slack webhook URL validated with regex in Zod schema | Matches backend validation /^https:\\/\\/hooks\\.slack\\.com\\// | 22-01 |
| PagerDuty routing key validated with z.string().length(32) | Matches backend 32-char requirement | 22-01 |
| Form constants SEVERITY_OPTIONS and EVENT_TYPE_OPTIONS | Ready for select/checkbox form components | 22-01 |
| Access Zod errors via issues not errors property | Zod v4 API change from errors to issues | 22-02 |
| AlertConfigCard uses callback props for mutations | Keeps card presentational; parent handles API and revalidation | 22-02 |
| PagerDuty modal excludes warning severity option | Per ALERT-07, warnings not sent to PagerDuty | 22-02 |
| Character counter for PagerDuty routing key | Visual feedback for 32-char requirement | 22-02 |
| assign-super-admin.ts uses SUPER_ADMIN_EMAIL env var | Clearer purpose than BREAK_GLASS_EMAIL | 23-02 |
| Role assignment script is idempotent | Safe to run multiple times without side effects | 23-02 |
| Script reports previous role for audit trail | Allows tracking of privilege changes | 23-02 |
| ADMIN_RBAC_ENABLED defaults to false | Requires explicit 'true' for safety during rollout | 23-01 |
| ADMIN_RBAC_SHADOW_MODE defaults to true | Allows baseline data collection without disruption | 23-01 |
| Audit log errors don't block RBAC decisions | Availability over logging for guard operations | 23-01 |
| 10%/30% thresholds for RBAC alerts | 10% warning, 30% critical aligns with gradual rollout strategy | 23-03 |
| 5m/2m durations for RBAC alerts | Warning gives investigation time; critical fires fast for rapid response | 23-03 |
| Rollback instructions in alert description | Include ADMIN_RBAC_ENABLED=false for quick remediation | 23-03 |
| Path regex filtering for admin endpoints | Using path=~"/admin/.*" for consistent matching | 23-03 |
| Runbook phases align with staged rollout strategy | Assign super_admin -> shadow mode -> communicate -> enforce | 23-04 |
| Emergency rollback uses single kubectl command | Operational speed for incident response | 23-04 |
| All Phase 23 artifacts cross-referenced in runbook | Key File Locations appendix helps ops team | 23-04 |

### Pending Todos

None — Milestone v1.2 complete.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-02
Stopped at: Milestone v1.2 complete
Resume file: None

Next: Milestone audit and completion
