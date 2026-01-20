# Stack Research: v1.2 Additions

**Project:** Nebula DNS Admin Dashboard (Mission Control)
**Researched:** 2026-01-19
**Focus:** RBAC, Slack/PagerDuty alerting, Admin user management

## Executive Summary

The existing NestJS codebase already has solid foundations for the v1.2 features. The RBAC patterns in `roles.guard.ts` can be extended for admin roles. The webhook infrastructure and `EncryptionAlertService` provide patterns for alerting. The invitation flow for family members provides a template for admin invites.

**Key finding:** No new major dependencies required for RBAC. Alerting requires only `@slack/webhook` (lightweight) and direct HTTP calls to PagerDuty Events API v2.

---

## New Dependencies

### RBAC

**No new libraries needed.** The existing patterns are sufficient.

The codebase already has:
- `RolesGuard` with `@Roles()` decorator in `/api/src/common/guards/roles.guard.ts`
- `Role` enum with `OWNER`, `ADMIN`, `ANALYST`, `READONLY`, `MEMBER`
- `Reflector` for metadata extraction
- Pattern uses NestJS native `SetMetadata` approach

**What to add for Admin RBAC:**

| Component | Approach | File |
|-----------|----------|------|
| `AdminRole` enum | New enum: `SUPER_ADMIN`, `ADMIN`, `VIEWER` | Create `admin-roles.guard.ts` |
| `@AdminRoles()` decorator | Mirrors `@Roles()` for admin context | Same file |
| `AdminRolesGuard` | Extends pattern from `RolesGuard` | Same file |
| `role` column | Add to `Admin` entity | Modify `admin.entity.ts` |

**Rationale:** Keep admin RBAC separate from tenant RBAC. Different JWT strategies (`admin-jwt` vs `jwt`), different role hierarchies, different guards. Mixing them creates confusion.

**Code pattern to follow:**
```typescript
// admin-roles.guard.ts
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',  // Full access, can manage other admins
  ADMIN = 'admin',               // Can manage MSPs, view all data
  VIEWER = 'viewer',             // Read-only access to dashboard
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
      [context.getHandler(), context.getClass()]
    );
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

**Confidence:** HIGH - This pattern is already working in the codebase.

---

### Alerting Integrations

#### Slack Integration

**Recommended:** `@slack/webhook` v7.x

| Package | Version | Weekly Downloads | Purpose |
|---------|---------|------------------|---------|
| `@slack/webhook` | ^7.0.0 | 4M+ | Incoming webhooks (simple alerting) |
| `@slack/web-api` | ^7.13.0 | 4M+ | Full API access (NOT needed) |

**Why `@slack/webhook` over `@slack/web-api`:**
- **Simpler:** Webhook-only, no OAuth/token management
- **Lighter:** ~100KB vs 2.75MB for web-api
- **Sufficient:** Admin alerts don't need message editing, reactions, channels API
- **Lower risk:** Webhook URLs are per-channel, limited blast radius

**Installation:**
```bash
cd api && npm install @slack/webhook@^7.0.0
```

**Integration pattern:**
```typescript
import { IncomingWebhook } from '@slack/webhook';

@Injectable()
export class SlackAlertService {
  private webhook: IncomingWebhook | null = null;

  constructor(private configService: ConfigService) {
    const url = this.configService.get('SLACK_WEBHOOK_URL');
    if (url) {
      this.webhook = new IncomingWebhook(url);
    }
  }

  async sendAlert(message: string, severity: 'info' | 'warning' | 'critical'): Promise<void> {
    if (!this.webhook) return;

    await this.webhook.send({
      text: message,
      attachments: [{
        color: severity === 'critical' ? '#dc2626' : severity === 'warning' ? '#f59e0b' : '#3b82f6',
        fields: [
          { title: 'Severity', value: severity, short: true },
          { title: 'Time', value: new Date().toISOString(), short: true },
        ],
      }],
    });
  }
}
```

**Confidence:** HIGH - Official Slack SDK, well-maintained, current version verified.

**Sources:**
- [npm @slack/webhook](https://www.npmjs.com/package/@slack/webhook)
- [Slack Node SDK Webhook Docs](https://docs.slack.dev/tools/node-slack-sdk/webhook/)

---

#### PagerDuty Integration

**Recommended:** Direct HTTP to Events API v2 (no SDK)

**Why no SDK:**
- `@pagerduty/pdjs` last release was over a year ago (not healthy cadence)
- Events API v2 is simple HTTP POST - SDK adds unnecessary abstraction
- Built-in retry logic in SDK (3 retries, 20s delay) may not match our needs
- Direct HTTP gives full control and matches existing webhook patterns

**DO NOT USE:**
- `@pagerduty/pdjs` - Stale, unnecessary abstraction
- `node-pagerduty` - Unofficial, outdated
- `pagerduty` - Minimal maintenance

**Integration pattern (matches existing `webhooksService.httpPost`):**
```typescript
@Injectable()
export class PagerDutyAlertService {
  private readonly routingKey: string | null;
  private readonly logger = new Logger(PagerDutyAlertService.name);

  constructor(private configService: ConfigService) {
    this.routingKey = this.configService.get('PAGERDUTY_ROUTING_KEY') || null;
  }

  async triggerIncident(
    summary: string,
    severity: 'critical' | 'error' | 'warning' | 'info',
    dedupKey?: string,
    customDetails?: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.routingKey) return false;

    const payload = {
      routing_key: this.routingKey,
      event_action: 'trigger',
      dedup_key: dedupKey,
      payload: {
        summary,
        source: 'nebula-dns-admin',
        severity,
        timestamp: new Date().toISOString(),
        custom_details: customDetails,
      },
      client: 'Nebula DNS Mission Control',
      client_url: this.configService.get('ADMIN_DASHBOARD_URL'),
    };

    try {
      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.ok;
    } catch (err) {
      this.logger.error(`PagerDuty trigger failed: ${err.message}`);
      return false;
    }
  }

  async resolveIncident(dedupKey: string): Promise<boolean> {
    if (!this.routingKey) return false;

    const payload = {
      routing_key: this.routingKey,
      event_action: 'resolve',
      dedup_key: dedupKey,
    };

    try {
      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.ok;
    } catch (err) {
      this.logger.error(`PagerDuty resolve failed: ${err.message}`);
      return false;
    }
  }
}
```

**Confidence:** HIGH - PagerDuty Events API v2 is stable and well-documented.

**Sources:**
- [PagerDuty Events API v2 Docs](https://developer.pagerduty.com/docs/events-api-v2/trigger-events/)
- [PagerDuty API Reference](https://developer.pagerduty.com/api-reference/f80f5db9acbe3-pager-duty-v2-events-api)

---

### Admin Management

**No new libraries needed.** Existing patterns cover all requirements.

#### Admin Invitations

Follow `FamilyInvitation` entity pattern from `/api/src/modules/family/entities/family-invitation.entity.ts`:

| Component | Existing Pattern | Notes |
|-----------|------------------|-------|
| `AdminInvitation` entity | `FamilyInvitation` | Token hash, expiry, status |
| Email sending | `EmailService.sendMspWelcomeEmail` | Extend with `sendAdminInviteEmail` |
| Token generation | `crypto.randomBytes()` | Already used in webhooks |

**Schema for AdminInvitation:**
```typescript
@Entity('admin_invitations')
export class AdminInvitation extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  role: AdminRole;

  @Column({ name: 'invited_by_admin_id', type: 'uuid' })
  invitedByAdminId: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 255, unique: true })
  tokenHash: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;
}
```

#### Admin Activity Logs

**Already exists:** `AuditLogsService` with hash-chain integrity.

Extend to capture admin actions:
- Add `AuditResourceType.ADMIN` enum value
- Log all admin CRUD operations
- Query by admin ID for activity view

#### MFA Management

**Already implemented:** `AdminMfa` entity with TOTP and backup codes.

For Super Admin to manage other admin MFA:
- Add `resetMfa(adminId)` method to `AdminService`
- Forces MFA re-enrollment on next login
- Audit log the action

---

## Integration Points

### With Existing Guards

```
Request Flow for Admin Endpoints:

Request → AdminAuthGuard (validates admin-jwt token)
        → AdminRolesGuard (checks role from JWT payload)
        → Controller handler
```

**Combine guards with `@UseGuards`:**
```typescript
@Controller('admin/settings')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
export class AdminSettingsController {

  @Get('users')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  listAdmins() { ... }

  @Post('users/invite')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  inviteAdmin() { ... }

  @Get('audit-logs')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  viewAuditLogs() { ... }
}
```

### With Existing Email Service

Add to `EmailService`:
```typescript
export interface AdminInviteEmailData {
  to: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

async sendAdminInviteEmail(data: AdminInviteEmailData): Promise<boolean>
```

### With Existing Audit Logging

Add to `AuditResourceType` enum:
```typescript
export enum AuditResourceType {
  // ... existing
  ADMIN = 'admin',
  ADMIN_MFA = 'admin_mfa',
  ALERT_CONFIG = 'alert_config',
}
```

### Alert Service Architecture

Create unified `AlertService` that wraps Slack and PagerDuty:

```typescript
@Injectable()
export class AlertService {
  constructor(
    private slack: SlackAlertService,
    private pagerduty: PagerDutyAlertService,
    private config: ConfigService,
  ) {}

  async sendAlert(
    type: AlertType,
    message: string,
    severity: AlertSeverity,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Route to appropriate channels based on type and severity
    const routes = this.getAlertRoutes(type, severity);

    if (routes.slack) {
      await this.slack.sendAlert(message, severity);
    }

    if (routes.pagerduty && severity === 'critical') {
      await this.pagerduty.triggerIncident(message, severity, type, metadata);
    }
  }
}
```

---

## What NOT to Add

### CASL / nest-casl

**Reason:** Overkill for this use case.

CASL is powerful for complex ABAC (attribute-based access control) with dynamic conditions. The admin dashboard needs simple role-based access:
- 3 roles with clear hierarchy
- No resource-level permissions
- No dynamic conditions

The existing `RolesGuard` pattern is simpler, more maintainable, and already understood by the team.

**Confidence:** HIGH - CASL adds complexity without value for this scope.

### @slack/web-api

**Reason:** Too heavy for webhooks-only use case.

Web API is 2.75MB and requires OAuth token management. Webhook package is ~100KB and only needs a URL.

If future requirements need:
- Editing messages
- Reactions
- Channel management
- User lookup

Then upgrade to `@slack/web-api`. Until then, use `@slack/webhook`.

### @pagerduty/pdjs

**Reason:** Stale package, unnecessary abstraction.

Last release over a year ago. Events API v2 is simple enough that direct HTTP is cleaner and more maintainable.

### Passport strategies for admin roles

**Reason:** Roles are in JWT payload, not separate auth.

Admin authentication already works via `AdminJwtStrategy`. Roles are stored in the `Admin` entity and included in the JWT. Adding a separate Passport strategy for roles adds complexity without benefit.

### Redis for alert rate limiting

**Reason:** Premature optimization.

Admin alerts are low-volume (ops team of 2-5). Rate limiting can be added later if needed. Don't add Redis dependency for alerts when simple in-memory throttling suffices.

---

## Recommendations

### Priority Order

| Priority | Component | Dependency | Effort |
|----------|-----------|------------|--------|
| 1 | Admin RBAC | None (extend existing) | Low |
| 2 | Admin entity role column | Migration only | Low |
| 3 | Slack alerting | `@slack/webhook@^7.0.0` | Medium |
| 4 | PagerDuty alerting | None (direct HTTP) | Medium |
| 5 | Admin invitations | None (extend existing) | Medium |
| 6 | Admin activity logs | Extend audit logging | Low |
| 7 | MFA management for admins | Extend AdminService | Low |

### Environment Variables to Add

```env
# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
PAGERDUTY_ROUTING_KEY=your-integration-key
ADMIN_DASHBOARD_URL=https://admin.nebuladns.com

# Alert routing (optional, for future configuration)
ALERT_SLACK_ENABLED=true
ALERT_PAGERDUTY_ENABLED=true
ALERT_PAGERDUTY_SEVERITY_THRESHOLD=critical
```

### Database Migrations

1. **Add role column to admins table:**
```sql
ALTER TABLE admins ADD COLUMN role VARCHAR(20) DEFAULT 'admin';
-- Set first admin as super_admin
UPDATE admins SET role = 'super_admin' WHERE id = (SELECT id FROM admins ORDER BY created_at LIMIT 1);
```

2. **Create admin_invitations table:**
```sql
CREATE TABLE admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  invited_by_admin_id UUID REFERENCES admins(id),
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Summary

| Feature | New Dependencies | Integration Approach |
|---------|------------------|---------------------|
| Admin RBAC | None | Extend `RolesGuard` pattern |
| Slack Alerts | `@slack/webhook@^7.0.0` | New `SlackAlertService` |
| PagerDuty Alerts | None | Direct HTTP to Events API v2 |
| Admin Invitations | None | Mirror `FamilyInvitation` pattern |
| Activity Logs | None | Extend `AuditLogsService` |
| MFA Management | None | Extend `AdminService` |

**Total new dependencies:** 1 (`@slack/webhook`)

**Sources:**
- [npm @slack/webhook](https://www.npmjs.com/package/@slack/webhook)
- [Slack Node SDK Webhook Docs](https://docs.slack.dev/tools/node-slack-sdk/webhook/)
- [PagerDuty Events API v2](https://developer.pagerduty.com/docs/events-api-v2/trigger-events/)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [NestJS Authorization](https://docs.nestjs.com/security/authorization)
