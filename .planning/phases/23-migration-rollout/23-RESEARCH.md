# Phase 23: Migration & Rollout - Research

**Researched:** 2026-02-02
**Domain:** Feature flags, shadow mode logging, production rollout, Grafana alerting
**Confidence:** HIGH

## Summary

Phase 23 implements the migration and rollout infrastructure for safely enabling RBAC enforcement in production. The existing codebase has mature patterns to follow: feature flags via `@nestjs/config` (FEATURE_MFA_ENABLED, FEATURE_SSO_ENABLED, etc.), the AdminRolesGuard for RBAC enforcement, comprehensive audit logging with hash-chain integrity, Prometheus/Grafana alerting infrastructure, and a working break-glass super admin creation script.

The core implementation involves:
1. Adding two feature flags: `ADMIN_RBAC_ENABLED` (default false) and `ADMIN_RBAC_SHADOW_MODE` (default true)
2. Modifying AdminRolesGuard to check these flags and log would-be denials without enforcing in shadow mode
3. Creating a migration script to assign super_admin role to a designated email
4. Adding Prometheus alerts for 403 response rate anomalies
5. Creating a Grafana dashboard panel for RBAC enforcement monitoring
6. Writing operational runbook documentation

**Primary recommendation:** Implement flag checking at the AdminRolesGuard level using ConfigService injection, with shadow mode logging to the existing audit log system. This follows the established codebase patterns and requires no new dependencies.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/config` | 3.x | Feature flag management | Already used for FEATURE_* flags |
| `@nestjs/common` | 10.x | Guards, Logger, decorators | Framework standard |
| `typeorm` | 0.3.x | Database migrations | Already in codebase |
| Prometheus | N/A | Metrics collection | Already configured |
| Grafana | 10.x | Alerting & dashboards | Already deployed |

### Supporting (Already in Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `AuditLogsService` | N/A | Hash-chain audit logs | For shadow mode logging |
| `AdminRole` enum | N/A | Role definitions | Already defined in Phase 17 |
| `admin-roles.guard.ts` | N/A | RBAC enforcement | Will be modified for flag checking |

### No New Dependencies Required
All patterns exist in the codebase. No new packages needed.

## Architecture Patterns

### Current Feature Flag Structure
```
api/src/config/configuration.ts  # Feature flag definitions
api/.env.example                 # Environment variable documentation
```

Existing pattern:
```typescript
// EnvironmentVariables class
@IsBoolean()
@IsOptional()
FEATURE_MFA_ENABLED: boolean = true;

// validate() function
FEATURE_MFA_ENABLED: config.FEATURE_MFA_ENABLED === 'true' || config.FEATURE_MFA_ENABLED === true,

// Configuration export
features: {
  mfa: process.env.FEATURE_MFA_ENABLED !== 'false',
}
```

### Pattern 1: RBAC Feature Flags
**What:** Add ADMIN_RBAC_ENABLED and ADMIN_RBAC_SHADOW_MODE to configuration
**When to use:** Always - for controlling RBAC enforcement
**Example:**
```typescript
// Source: Existing api/src/config/configuration.ts pattern
@IsBoolean()
@IsOptional()
ADMIN_RBAC_ENABLED: boolean = false; // Default OFF for safe deployment

@IsBoolean()
@IsOptional()
ADMIN_RBAC_SHADOW_MODE: boolean = true; // Default ON for logging

// In validate():
ADMIN_RBAC_ENABLED: config.ADMIN_RBAC_ENABLED === 'true',
ADMIN_RBAC_SHADOW_MODE: config.ADMIN_RBAC_SHADOW_MODE !== 'false',

// In default export:
admin: {
  rbacEnabled: process.env.ADMIN_RBAC_ENABLED === 'true',
  rbacShadowMode: process.env.ADMIN_RBAC_SHADOW_MODE !== 'false',
}
```

### Pattern 2: Guard Flag Checking with Shadow Mode
**What:** AdminRolesGuard checks flags before enforcing, logs in shadow mode
**When to use:** On every role check
**Example:**
```typescript
// Source: Existing AdminRolesGuard + ConfigService injection
@Injectable()
export class AdminRolesGuard implements CanActivate {
  private readonly logger = new Logger(AdminRolesGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private auditLogsService: AuditLogsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const rbacEnabled = this.configService.get<boolean>('admin.rbacEnabled', false);
    const shadowMode = this.configService.get<boolean>('admin.rbacShadowMode', true);

    // Check if role would be denied
    const wouldBeDenied = !user?.role || !requiredRoles.includes(user.role);

    if (wouldBeDenied) {
      // Log the would-be denial (for both shadow mode and actual enforcement)
      await this.logRbacDecision(
        user,
        request,
        requiredRoles,
        rbacEnabled && !shadowMode ? 'denied' : 'shadow_denied'
      );

      // If RBAC is disabled, allow
      if (!rbacEnabled) {
        return true;
      }

      // If shadow mode is enabled, log but allow
      if (shadowMode) {
        this.logger.warn(
          `Shadow mode: Would deny ${user?.email || 'unknown'} access to ${request.method} ${request.url} (requires ${requiredRoles.join(' or ')})`
        );
        return true;
      }

      // RBAC enabled and shadow mode off - actually deny
      throw new ForbiddenException(
        `Requires ${requiredRoles.join(' or ')} role`
      );
    }

    return true;
  }

  private async logRbacDecision(
    user: AdminUser | undefined,
    request: Request,
    requiredRoles: AdminRole[],
    decision: 'denied' | 'shadow_denied',
  ): Promise<void> {
    // Use synthetic admin tenant ID for admin audit logs
    const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000000';

    await this.auditLogsService.log({
      tenantId: ADMIN_TENANT_ID,
      userId: null, // Admin user, not tenant user
      action: decision === 'denied' ? 'rbac_denied' : 'rbac_shadow_denied',
      resourceType: 'admin',
      resourceId: user?.adminId || null,
      resourceName: user?.email || 'unknown',
      metadata: {
        method: request.method,
        path: request.url,
        requiredRoles,
        userRole: user?.role || null,
        decision,
      },
    });
  }
}
```

### Pattern 3: Migration Script for Super Admin Assignment
**What:** CLI script to assign super_admin role to existing admin by email
**When to use:** Before enabling RBAC enforcement
**Example:**
```typescript
// Source: Existing create-super-admin.ts pattern
// api/src/scripts/assign-super-admin.ts
#!/usr/bin/env ts-node

async function assignSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;

  if (!email) {
    console.error('ERROR: SUPER_ADMIN_EMAIL environment variable required');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const adminRepository = app.get<Repository<Admin>>(getRepositoryToken(Admin));

  const admin = await adminRepository.findOne({
    where: { email: email.toLowerCase() },
  });

  if (!admin) {
    console.error(`ERROR: No admin found with email ${email}`);
    process.exit(1);
  }

  if (admin.role === AdminRole.SUPER_ADMIN) {
    console.log(`Admin ${email} is already a super_admin`);
    process.exit(0);
  }

  const oldRole = admin.role;
  await adminRepository.update(admin.id, { role: AdminRole.SUPER_ADMIN });

  console.log(`Successfully assigned super_admin role to ${email}`);
  console.log(`Previous role: ${oldRole}`);

  await app.close();
}
```

### Pattern 4: Prometheus Alert for 403 Rate Spike
**What:** Alert rule for unusual 403 response rate
**When to use:** After RBAC enforcement is enabled
**Example:**
```yaml
# Source: Existing monitoring/prometheus/rules/nebuladns-alerts.yml
- alert: Admin403RateSpike
  expr: |
    (
      sum(rate(http_requests_total{job="nebuladns-api",path=~"/admin/.*",status="403"}[5m]))
      /
      sum(rate(http_requests_total{job="nebuladns-api",path=~"/admin/.*"}[5m]))
    ) > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High 403 rate on admin endpoints"
    description: "Admin endpoint 403 rate is above 10% for 5 minutes - may indicate RBAC misconfiguration"

- alert: Admin403RateCritical
  expr: |
    (
      sum(rate(http_requests_total{job="nebuladns-api",path=~"/admin/.*",status="403"}[5m]))
      /
      sum(rate(http_requests_total{job="nebuladns-api",path=~"/admin/.*"}[5m]))
    ) > 0.3
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Critical 403 rate on admin endpoints"
    description: "Admin endpoint 403 rate is above 30% for 2 minutes - RBAC rollback may be needed"
```

### Pattern 5: Grafana Dashboard Panel for RBAC Monitoring
**What:** Time series panel showing admin 403 rate over time
**When to use:** During and after RBAC rollout
**Example:**
```json
{
  "title": "Admin 403 Rate",
  "type": "timeseries",
  "datasource": { "type": "prometheus", "uid": "${DS_PROMETHEUS}" },
  "targets": [
    {
      "expr": "sum(rate(http_requests_total{job=\"nebuladns-api\",path=~\"/admin/.*\",status=\"403\"}[5m])) / sum(rate(http_requests_total{job=\"nebuladns-api\",path=~\"/admin/.*\"}[5m]))",
      "legendFormat": "403 Rate"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percentunit",
      "thresholds": {
        "mode": "absolute",
        "steps": [
          { "color": "green", "value": null },
          { "color": "yellow", "value": 0.05 },
          { "color": "red", "value": 0.1 }
        ]
      }
    }
  }
}
```

### Anti-Patterns to Avoid
- **Enabling RBAC without a super_admin:** Always run migration script before setting ADMIN_RBAC_ENABLED=true
- **Skipping shadow mode:** Always run shadow mode for at least 24-48 hours to collect data
- **Modifying guard behavior in production:** Use feature flags, not code changes
- **Alert fatigue:** Start with 10% threshold, tighten after baseline is established

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Feature flags | Custom flag system | ConfigService + env vars | Already established pattern |
| Audit logging | Custom log files | AuditLogsService | Hash-chain integrity, existing queries |
| Metrics collection | Custom counters | Prometheus http_requests_total | Already collecting status codes |
| Alerting | Custom notification | Prometheus alerts + AlertDispatcher | Already integrated with Slack/PagerDuty |
| Dashboard | Custom monitoring | Grafana panels | Already deployed, team familiarity |

**Key insight:** The migration/rollout infrastructure is about connecting existing pieces, not building new systems. ConfigService for flags, AuditLogsService for logging, Prometheus for metrics, Grafana for dashboards.

## Common Pitfalls

### Pitfall 1: No Super Admin Before Enforcement
**What goes wrong:** RBAC is enabled but no admin has super_admin role
**Why it happens:** Migration script not run, or wrong email specified
**How to avoid:** Migration script checks for existing super_admin, warns if none
**Warning signs:** All admins get 403 on super_admin endpoints immediately after enablement

### Pitfall 2: Shadow Mode Disabled Prematurely
**What goes wrong:** RBAC enforcement enabled before shadow mode data is analyzed
**Why it happens:** Pressure to "ship" the feature, insufficient time for monitoring
**How to avoid:** Require 24-48 hours of shadow mode data with review before enforcement
**Warning signs:** High shadow_denied count in audit logs not investigated

### Pitfall 3: Feature Flag Not Synchronized
**What goes wrong:** ADMIN_RBAC_ENABLED=true in some pods but not others (rolling deploy)
**Why it happens:** Environment variable changed during deployment
**How to avoid:** Deploy with flag OFF, enable flag after all pods are running
**Warning signs:** Intermittent 403s during deployment window

### Pitfall 4: Insufficient Alert Threshold Calibration
**What goes wrong:** Alert fires constantly (too low) or never fires (too high)
**Why it happens:** Threshold set without baseline data
**How to avoid:** Collect baseline 403 rate during shadow mode, set alert at 2x baseline
**Warning signs:** Alert fatigue or missed incidents

### Pitfall 5: Missing Rollback Documentation
**What goes wrong:** Incident response team doesn't know how to disable RBAC
**Why it happens:** Runbook not created or not accessible
**How to avoid:** Runbook includes exact env var commands and verification steps
**Warning signs:** On-call engineer asks "how do I turn this off?" during incident

### Pitfall 6: Audit Log Action Type Missing
**What goes wrong:** Shadow mode denials not appearing in audit log queries
**Why it happens:** New action type not added to AuditAction type
**How to avoid:** Add 'rbac_denied' and 'rbac_shadow_denied' to AuditAction type
**Warning signs:** TypeScript compilation errors or missing log entries

## Code Examples

Verified patterns from codebase:

### Adding New Audit Actions
```typescript
// Source: api/src/modules/audit-logs/entities/audit-log.entity.ts
// Add to AuditAction type:
export type AuditAction =
  | 'create'
  // ... existing actions ...
  | 'admin_role_changed'
  | 'rbac_denied'           // NEW: Actual 403 denial
  | 'rbac_shadow_denied';   // NEW: Would-be denial in shadow mode
```

### ConfigService Injection in Guard
```typescript
// Source: NestJS official pattern
// AdminRolesGuard constructor modification
constructor(
  private reflector: Reflector,
  private configService: ConfigService,  // NEW
  private auditLogsService: AuditLogsService,  // NEW
) {}
```

### Environment Variable Documentation
```bash
# Source: api/.env.example pattern
# Add to FEATURE FLAGS section:

# ============================================
# ADMIN RBAC FEATURE FLAGS
# ============================================
# Enable RBAC enforcement for admin endpoints
# Set to 'true' ONLY after running migration script and reviewing shadow logs
ADMIN_RBAC_ENABLED=false

# Shadow mode: log would-be denials without actually denying
# Keep 'true' during initial rollout to collect baseline data
ADMIN_RBAC_SHADOW_MODE=true
```

### Runbook Rollback Command
```bash
# Source: Common operational pattern
# Emergency RBAC Disable
kubectl set env deployment/nebula-api ADMIN_RBAC_ENABLED=false -n nebula-dns

# Verify rollback
kubectl rollout status deployment/nebula-api -n nebula-dns
kubectl logs -l app=nebula-api -n nebula-dns --tail=100 | grep -i rbac
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Big bang deployment | Feature flags + shadow mode | Best practice | Gradual, reversible rollout |
| Manual monitoring | Prometheus alerts | Always | Automated anomaly detection |
| Code rollback | Flag toggle | Best practice | Faster incident response |
| Verbal handoff | Runbook documentation | Always | Reliable operational knowledge |

**Deprecated/outdated:**
- None - this phase uses established DevOps patterns

## Open Questions

Things that couldn't be fully resolved:

1. **Shadow mode duration**
   - What we know: Need enough time to see all admin usage patterns
   - What's unclear: Exact duration depends on admin activity levels
   - Recommendation: Minimum 24 hours, ideally 48-72 hours covering weekday + weekend

2. **403 rate baseline**
   - What we know: Some 403s will occur naturally (expired tokens, etc.)
   - What's unclear: What's the "normal" 403 rate before RBAC
   - Recommendation: Measure baseline during shadow mode, alert at 2x baseline

3. **Communication timing**
   - What we know: Admins need warning before permissions change
   - What's unclear: Optimal advance notice period
   - Recommendation: 1 week email notice before shadow mode, 1 week before enforcement

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `api/src/config/configuration.ts` - Feature flag pattern
  - `api/src/modules/admin/guards/admin-roles.guard.ts` - RBAC enforcement
  - `api/src/modules/audit-logs/` - Audit logging service
  - `api/src/scripts/create-super-admin.ts` - CLI script pattern
  - `monitoring/prometheus/rules/nebuladns-alerts.yml` - Alert rule pattern
  - `monitoring/grafana/dashboards/api-performance.json` - Dashboard panel pattern

### Secondary (MEDIUM confidence)
- [Feature flags in NestJS - Theodo](https://blog.theodo.com/2023/10/feature-flags-nestjs/) - Guard pattern with ConfigService
- [RBAC Best Practices - Oso](https://www.osohq.com/learn/rbac-best-practices) - Phased rollout approach
- [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/) - Alert rule configuration

### Tertiary (LOW confidence)
- None - all critical patterns verified in codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All patterns already in codebase
- Architecture: HIGH - Following established FEATURE_* pattern
- Pitfalls: HIGH - Based on documented migration pitfalls (PITFALLS.md)
- Monitoring: HIGH - Prometheus/Grafana already configured

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - operational patterns are stable)

---

## Implementation Notes for Planner

### Files to Modify
1. `api/src/config/configuration.ts` - Add ADMIN_RBAC_* flags
2. `api/.env.example` - Document new environment variables
3. `api/src/modules/admin/guards/admin-roles.guard.ts` - Add flag checking + shadow mode
4. `api/src/modules/audit-logs/entities/audit-log.entity.ts` - Add new action types
5. `monitoring/prometheus/rules/nebuladns-alerts.yml` - Add 403 rate alerts
6. `monitoring/grafana/dashboards/` - Add RBAC monitoring panel

### Files to Create
1. `api/src/scripts/assign-super-admin.ts` - Migration script
2. `docs/RBAC-ROLLOUT-RUNBOOK.md` - Operational runbook

### Rollout Order
1. Deploy code with ADMIN_RBAC_ENABLED=false (all changes, flag off)
2. Run migration script to assign super_admin
3. Enable shadow mode logging (ADMIN_RBAC_SHADOW_MODE=true)
4. Monitor shadow logs for 24-48 hours
5. Send admin communication email
6. Enable RBAC enforcement (ADMIN_RBAC_ENABLED=true)
7. Monitor 403 rate alerts closely for first 24 hours

### Synthetic Tenant ID
Per prior decisions, admin audit logs use: `00000000-0000-0000-0000-000000000000`
