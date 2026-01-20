# Architecture Research: v1.2 Mission Control Enhancements
# Nebula DNS - Architecture Dimension Research
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Domain:** Admin Dashboard RBAC, Alerting, and User Management
**Researched:** 2026-01-19
**Confidence:** HIGH (based on existing codebase analysis)

## Executive Summary

The v1.2 milestone adds three key capabilities to Mission Control: role-based access control (RBAC), alerting integrations (Slack/PagerDuty), and admin user management. The existing architecture provides solid foundations for these features:

- **Admin Module** already exists with JWT authentication, session management, and audit logging
- **Existing patterns** for external integrations (webhooks, SIEM) can be adapted for alerting
- **RolesGuard pattern** from tenant users provides RBAC blueprint

All three features integrate naturally into the existing admin module structure with minimal architectural changes.

---

## Integration Points

### Existing Components to Modify

| Component | Location | Modification Needed |
|-----------|----------|---------------------|
| `Admin` entity | `api/src/modules/admin/entities/admin.entity.ts` | Add `role` column for RBAC |
| `AdminJwtPayload` | `api/src/modules/admin/dto/admin-jwt-payload.dto.ts` | Add `role` claim to JWT |
| `AdminAuthGuard` | `api/src/modules/admin/guards/admin-auth.guard.ts` | Extract user with role, no other changes |
| `AdminService` | `api/src/modules/admin/admin.service.ts` | Add admin CRUD, role assignment |
| `AdminController` | `api/src/modules/admin/admin.controller.ts` | Add admin management endpoints |
| `AdminModule` | `api/src/modules/admin/admin.module.ts` | Import new services, entities |
| `AdminAuthContext` | `ui/src/contexts/AdminAuthContext.tsx` | Add role to admin user, permission helpers |
| `init-postgres.sql` | `scripts/init-postgres.sql` | Add `admins` table role column, alert configs table |

### Existing Patterns to Reuse

| Pattern | Source | Reuse For |
|---------|--------|-----------|
| `RolesGuard` + `@Roles()` decorator | `api/src/common/guards/roles.guard.ts` | Admin roles guard |
| `WebhooksService.deliver()` | `api/src/modules/webhooks/webhooks.service.ts` | Alert delivery with retries |
| `SiemIntegration` entity structure | `api/src/modules/siem/entities/siem-integration.entity.ts` | Alert config storage |
| `EmailService.sendInviteUserEmail()` | `api/src/modules/email/email.service.ts` | Admin invitation emails |
| `AuditLogsService.log()` | `api/src/modules/audit-logs/audit-logs.service.ts` | Admin action logging |

---

## New Components Needed

### API Layer

```
api/src/modules/admin/
├── guards/
│   └── admin-roles.guard.ts         # NEW: RBAC guard for admin endpoints
├── decorators/
│   └── admin-roles.decorator.ts     # NEW: @AdminRoles() decorator
├── services/
│   └── admin-alerting.service.ts    # NEW: Slack/PagerDuty delivery
├── entities/
│   ├── admin.entity.ts              # MODIFY: Add role column
│   ├── admin-invitation.entity.ts   # NEW: Admin invites
│   └── admin-alert-config.entity.ts # NEW: Alert configurations
├── dto/
│   ├── admin-user-management.dto.ts # NEW: CRUD DTOs
│   ├── admin-invitation.dto.ts      # NEW: Invite DTOs
│   └── admin-alerting.dto.ts        # NEW: Alert config DTOs
└── admin.controller.ts              # MODIFY: Add management endpoints
```

### UI Layer

```
ui/src/app/mission-control/
├── settings/
│   ├── users/
│   │   └── page.tsx                 # NEW: Admin user management
│   └── alerts/
│       └── page.tsx                 # NEW: Alert configuration
├── components/
│   ├── AdminUserTable.tsx           # NEW: User list with role badges
│   ├── InviteAdminModal.tsx         # NEW: Invitation form
│   ├── AlertConfigForm.tsx          # NEW: Slack/PagerDuty config
│   └── RoleGate.tsx                 # NEW: Conditional rendering by role

ui/src/hooks/
├── useAdminRole.ts                  # NEW: Permission checking hook
└── useAdminUsers.ts                 # NEW: Admin user management hook
```

---

## Database Schema

### New Tables

#### `admin_roles` (ENUM - stored in `admins.role`)

```sql
-- Admin role column (added to existing admins table)
ALTER TABLE admins ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin'
  CHECK (role IN ('super_admin', 'admin', 'viewer'));

-- Super Admin: Full access to all Mission Control features
-- Admin: Can manage MSPs, tenants, impersonate, but cannot manage other admins
-- Viewer: Read-only access to dashboards, search, health monitoring
```

**Role Hierarchy:**
| Role | Manage Admins | Manage MSPs/Tenants | Impersonate | View Dashboard | Configure Alerts |
|------|--------------|---------------------|-------------|----------------|------------------|
| `super_admin` | Yes | Yes | Yes | Yes | Yes |
| `admin` | No | Yes | Yes | Yes | No |
| `viewer` | No | No | No | Yes | No |

#### `admin_invitations` Table

```sql
CREATE TABLE admin_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'viewer')),
    invited_by UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX idx_admin_invitations_expires ON admin_invitations(expires_at) WHERE status = 'pending';
```

#### `admin_alert_configs` Table

```sql
CREATE TABLE admin_alert_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('slack', 'pagerduty')),
    is_enabled BOOLEAN DEFAULT TRUE,

    -- Encrypted configuration (webhook URL or API key)
    config_encrypted JSONB NOT NULL DEFAULT '{}',

    -- Event types to alert on
    alert_events JSONB NOT NULL DEFAULT '["system_health_critical", "msp_suspended"]',

    -- Severity threshold (info, warning, critical)
    min_severity VARCHAR(20) DEFAULT 'warning',

    -- Delivery tracking
    last_sent_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,

    -- Audit
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_alert_configs_provider ON admin_alert_configs(provider);
CREATE INDEX idx_admin_alert_configs_enabled ON admin_alert_configs(is_enabled);
```

### Modified Tables

#### `admins` Table Additions

```sql
-- Add role column with default for existing admins
ALTER TABLE admins ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin'
  CHECK (role IN ('super_admin', 'admin', 'viewer'));

-- Add last_activity_at for activity tracking
ALTER TABLE admins ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE;

-- Index for role-based queries
CREATE INDEX idx_admins_role ON admins(role);
```

---

## Data Flow

### RBAC Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST LIFECYCLE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

1. HTTP Request with Bearer Token
        │
        ▼
2. AdminAuthGuard
   ├── Extract JWT from Authorization header
   ├── Verify signature with ADMIN_JWT_SECRET
   ├── Check token not blacklisted (Redis)
   └── Attach AdminUser to request (includes role)
        │
        ▼
3. AdminRolesGuard (NEW)
   ├── Read @AdminRoles() decorator from handler/class
   ├── Extract user.role from request
   ├── Check if user.role meets requirement
   │   ├── super_admin: ['super_admin']
   │   ├── admin: ['super_admin', 'admin']
   │   └── viewer: ['super_admin', 'admin', 'viewer']
   └── Return true/false
        │
        ▼
4. Controller Method Executes
```

**Implementation Pattern (mirrors existing RolesGuard):**

```typescript
// admin-roles.guard.ts
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

export const ADMIN_ROLES_KEY = 'admin_roles';

export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // No roles specified = any authenticated admin
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
```

**Usage:**

```typescript
@Controller('admin')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
export class AdminController {

  // Only super_admin can manage other admins
  @Post('users')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  async createAdmin() { ... }

  // admin and super_admin can manage MSPs
  @Post('msp/tenants')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  async createMspTenant() { ... }

  // All roles can view health status
  @Get('system/health')
  // No @AdminRoles - any authenticated admin
  async getSystemHealth() { ... }
}
```

### Alerting Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ALERTING ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

Event Source                    Processing                    Delivery
─────────────                   ──────────                    ────────

AdminHealthService          ┌──────────────────┐
  │ System health check     │                  │         ┌─────────────┐
  │ detects critical issue  │  AdminAlerting   │────────►│   Slack     │
  └────────────────────────►│    Service       │         │  Webhook    │
                            │                  │         └─────────────┘
AdminBillingService         │  - Filter by     │
  │ MSP enters grace period │    event type    │         ┌─────────────┐
  │ or gets suspended       │  - Filter by     │────────►│  PagerDuty  │
  └────────────────────────►│    severity      │         │     API     │
                            │  - Format        │         └─────────────┘
SubscriptionLapseService    │    payload       │
  │ Tenant suspension event │  - Retry on      │
  └────────────────────────►│    failure       │
                            │  - Track         │
Manual Trigger              │    delivery      │
  │ Admin creates test      │                  │
  └────────────────────────►└──────────────────┘
```

**Alert Events:**

| Event | Severity | Description |
|-------|----------|-------------|
| `system_health_critical` | critical | DNS services down, DB unreachable |
| `system_health_degraded` | warning | High error rate, slow queries |
| `msp_grace_period` | warning | MSP entered payment grace period |
| `msp_suspended` | critical | MSP suspended for non-payment |
| `high_query_volume` | info | Unusual spike in DNS queries |
| `admin_login_failed` | warning | Multiple failed admin login attempts |

**Slack Payload Format:**

```json
{
  "channel": "#nebula-alerts",
  "username": "Nebula DNS Alerts",
  "icon_emoji": ":warning:",
  "attachments": [
    {
      "color": "#dc3545",
      "title": "Critical: System Health Alert",
      "text": "PostgreSQL connection failed",
      "fields": [
        { "title": "Service", "value": "Database", "short": true },
        { "title": "Status", "value": "Unreachable", "short": true }
      ],
      "ts": 1737331200
    }
  ]
}
```

**PagerDuty Payload Format:**

```json
{
  "routing_key": "{{encrypted_integration_key}}",
  "event_action": "trigger",
  "dedup_key": "nebula-system-health-postgres-{{timestamp}}",
  "payload": {
    "summary": "Critical: PostgreSQL connection failed",
    "severity": "critical",
    "source": "mission-control.nebuladns.com",
    "class": "system_health",
    "custom_details": {
      "service": "Database",
      "status": "Unreachable",
      "timestamp": "2026-01-19T12:00:00Z"
    }
  }
}
```

### Admin User Management Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ADMIN INVITATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Super Admin                 API                        New Admin
────────────               ───                        ─────────

    │                        │                            │
    │ POST /admin/users      │                            │
    │ {email, role}          │                            │
    │───────────────────────►│                            │
    │                        │                            │
    │                        │ 1. Validate email unique   │
    │                        │ 2. Generate secure token   │
    │                        │ 3. Hash token, store in    │
    │                        │    admin_invitations       │
    │                        │ 4. Send invitation email   │
    │                        │───────────────────────────►│
    │  {invitation_id}       │                            │
    │◄───────────────────────│                            │
    │                        │                            │
    │                        │                            │ Click link
    │                        │                            │───────────┐
    │                        │                            │           │
    │                        │ GET /admin/invite/accept   │◄──────────┘
    │                        │ ?token=xxx                 │
    │                        │◄───────────────────────────│
    │                        │                            │
    │                        │ 1. Verify token hash       │
    │                        │ 2. Check not expired       │
    │                        │ 3. Return invitation info  │
    │                        │                            │
    │                        │ {email, role, form}        │
    │                        │───────────────────────────►│
    │                        │                            │
    │                        │                            │ Fill form
    │                        │ POST /admin/invite/accept  │ (name, password)
    │                        │ {token, name, password}    │───────────┐
    │                        │◄───────────────────────────│           │
    │                        │                            │◄──────────┘
    │                        │ 1. Re-verify token         │
    │                        │ 2. Create admin record     │
    │                        │ 3. Mark invite accepted    │
    │                        │ 4. Generate JWT            │
    │                        │ 5. Audit log              │
    │                        │                            │
    │                        │ {accessToken, admin}       │
    │                        │───────────────────────────►│
    │                        │                            │
    │                        │                            │ Redirected to
    │                        │                            │ /mission-control
```

---

## Build Order

### Recommended Phase Sequence

Based on dependency analysis and risk assessment:

#### Phase 1: Admin RBAC (Foundation)

**Rationale:** RBAC is foundational - alerting and user management depend on it.

| Task | Dependencies | Effort |
|------|--------------|--------|
| Add `role` column to `admins` table | None | Low |
| Update `Admin` entity with role | DB migration | Low |
| Add role to JWT payload | Entity change | Low |
| Create `AdminRolesGuard` and decorator | JWT change | Medium |
| Apply guards to existing endpoints | Guard ready | Medium |
| Update UI `AdminAuthContext` with role | API changes | Low |
| Create `RoleGate` component | Context update | Low |
| Add permission helpers/hooks | Context update | Low |

**Deliverables:**
- All existing admin endpoints protected by role
- UI conditionally renders based on role
- First super_admin seeded in database

#### Phase 2: Admin User Management

**Rationale:** Needs RBAC to protect management endpoints.

| Task | Dependencies | Effort |
|------|--------------|--------|
| Create `admin_invitations` table | Phase 1 complete | Low |
| Create `AdminInvitation` entity | DB migration | Low |
| Add invitation email template | Entity ready | Medium |
| Create invite endpoints (create, accept) | Email template | Medium |
| Create admin CRUD endpoints (list, update, revoke) | RBAC guards | Medium |
| Build admin users settings page | API endpoints | Medium |
| Build invite modal component | Settings page | Low |
| Add activity tracking middleware | Endpoints ready | Low |

**Deliverables:**
- Super admins can invite new admins
- Admins can be listed, updated, deactivated
- Invitation flow with email notification
- Last activity tracking

#### Phase 3: Alerting Integrations

**Rationale:** Isolated feature, no dependencies on Phase 2.

| Task | Dependencies | Effort |
|------|--------------|--------|
| Create `admin_alert_configs` table | Phase 1 (for created_by) | Low |
| Create `AdminAlertConfig` entity | DB migration | Low |
| Create `AdminAlertingService` | Entity ready | High |
| Implement Slack webhook delivery | Service structure | Medium |
| Implement PagerDuty API delivery | Service structure | Medium |
| Integrate with `AdminHealthService` | Alerting service | Medium |
| Build alert configuration UI page | API endpoints | Medium |
| Add test alert functionality | Config UI | Low |

**Deliverables:**
- Slack and PagerDuty integrations configurable
- System health events trigger alerts
- Test alert functionality
- Delivery status tracking

---

## Technical Decisions

### Decision 1: Flat vs Hierarchical Roles

**Recommendation:** Flat roles with explicit permissions

**Options Considered:**
1. **Hierarchical** (super_admin > admin > viewer) - Implicit permissions
2. **Flat with explicit permissions** - Each role has explicit capabilities
3. **Permission-based** - Granular permissions assigned to roles

**Decision:** Option 1 (Hierarchical) with explicit guard checks

**Rationale:**
- Only 3 roles needed - complexity of permission-based is overkill
- Hierarchical is intuitive for admins
- Guard implementation is simple: check if role is in allowed list
- Can evolve to permission-based later if needed

### Decision 2: Alert Delivery Architecture

**Recommendation:** Synchronous delivery with background retry queue

**Options Considered:**
1. **Fully synchronous** - Block until delivered
2. **Fully async (Redis queue)** - Immediate return, background processing
3. **Hybrid** - Sync first attempt, queue retries

**Decision:** Option 3 (Hybrid)

**Rationale:**
- Immediate feedback for test alerts
- Critical alerts should attempt delivery immediately
- Failed deliveries queued for retry (reuse existing Redis patterns)
- Matches existing webhook delivery pattern in codebase

### Decision 3: Admin Invitation Token Storage

**Recommendation:** Hashed tokens with 7-day expiry

**Pattern:** Match existing `team_invitations` table pattern

```typescript
// Generate invitation
const token = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

// Store hash, send raw token in email URL
```

**Rationale:**
- Consistent with existing invitation patterns
- Tokens not stored in plain text
- 7-day expiry matches team invitations

### Decision 4: Alert Config Encryption

**Recommendation:** Reuse SIEM encryption pattern

```typescript
// Reuse existing encryption utility
import { encrypt, decrypt, deriveKey } from '../../common/utils/encryption.util';

// Derive key specific to alerting
const alertKey = deriveKey(getEncryptionKey('ALERT_ENCRYPTION_KEY'), 'alerting-gcm-salt');
```

**Rationale:**
- Webhook URLs and API keys are sensitive
- Existing encryption util handles AES-256-GCM
- Consistent security posture across integrations

### Decision 5: UI Architecture for Settings

**Recommendation:** Nested routes under `/mission-control/settings/`

```
/mission-control/settings/
├── users/     - Admin user management
├── alerts/    - Alert configuration
└── profile/   - Current admin profile (future)
```

**Rationale:**
- Settings grouped logically
- Consistent with existing dashboard patterns
- Easy to add more settings in future

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing admin auth | Medium | High | Add role with default='admin' for existing admins |
| Alert delivery failures | Medium | Medium | Implement retry queue, track error counts |
| Invitation token exposure | Low | High | Hash tokens, short expiry, audit logging |
| Role escalation | Low | Critical | Server-side validation only, no client trust |

---

## Migration Strategy

### Database Migration Order

1. **Migration: AddAdminRole**
   - Add `role` column to `admins` with default 'admin'
   - Index on role column

2. **Migration: CreateAdminInvitations**
   - Create `admin_invitations` table
   - Add indexes

3. **Migration: CreateAdminAlertConfigs**
   - Create `admin_alert_configs` table
   - Add indexes

### Seed Data

```sql
-- Ensure at least one super_admin exists
UPDATE admins SET role = 'super_admin'
WHERE email = (SELECT email FROM admins ORDER BY created_at LIMIT 1);
```

---

## Sources

All findings based on direct codebase analysis:

- `/Users/jeremymcspadden/Github/nebula-dns/api/src/modules/admin/` - Existing admin module
- `/Users/jeremymcspadden/Github/nebula-dns/api/src/common/guards/roles.guard.ts` - RolesGuard pattern
- `/Users/jeremymcspadden/Github/nebula-dns/api/src/modules/webhooks/webhooks.service.ts` - Delivery pattern
- `/Users/jeremymcspadden/Github/nebula-dns/api/src/modules/siem/siem.service.ts` - Encryption pattern
- `/Users/jeremymcspadden/Github/nebula-dns/api/src/modules/email/email.service.ts` - Email templates
- `/Users/jeremymcspadden/Github/nebula-dns/scripts/init-postgres.sql` - Database schema
- `/Users/jeremymcspadden/Github/nebula-dns/ui/src/contexts/AdminAuthContext.tsx` - UI auth context
