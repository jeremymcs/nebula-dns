# Phase 17: RBAC Foundation (Backend) - Research

// Nebula DNS Admin Dashboard - Phase 17 Research
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Researched:** 2026-01-20
**Domain:** NestJS RBAC, Admin Authentication, Guards & Decorators
**Confidence:** HIGH

## Summary

The Nebula DNS codebase already has a mature admin authentication system with JWT tokens, session management, and a separate authentication flow from tenant users. The admin entity exists but lacks a `role` column. The codebase has established patterns for RBAC with tenant users (RolesGuard, @Roles decorator) that can be adapted for admin roles.

This phase requires:
1. Adding a `role` column to the Admin entity (three roles: super_admin, admin, viewer)
2. Creating AdminRolesGuard to validate roles per endpoint
3. Creating @AdminRoles() decorator for specifying required roles
4. Including role in JWT payload
5. Annotating all existing admin endpoints with role requirements
6. Implementing self-escalation prevention
7. Ensuring at least one super_admin always exists

**Primary recommendation:** Follow the existing tenant RBAC pattern (RolesGuard + @Roles decorator) but create admin-specific versions (AdminRolesGuard + @AdminRoles) to maintain separation between tenant and admin authentication systems.

## Standard Stack

The codebase already uses the standard NestJS patterns for RBAC.

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/passport | ^10.x | Authentication strategies | NestJS recommended |
| passport-jwt | ^4.x | JWT validation | Industry standard |
| @nestjs/common | ^10.x | Guards, decorators, metadata | Framework built-in |

### Supporting (Already in Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Reflector | built-in | Metadata retrieval in guards | Reading decorator metadata |
| SetMetadata | built-in | Attaching metadata to handlers | Creating custom decorators |

### No New Dependencies Required
The existing codebase has all necessary tooling. No additional packages needed.

## Architecture Patterns

### Existing Admin Auth Structure
```
api/src/modules/admin/
├── admin.controller.ts      # ~1080 lines, 24 endpoints using @UseGuards(AdminAuthGuard)
├── admin.module.ts          # Module with JWT config, separate ADMIN_JWT_SECRET
├── admin.service.ts         # Login, logout, tenant search, MSP management
├── admin-session.service.ts # Redis session management
├── admin-health.service.ts  # System health endpoints
├── admin-billing.service.ts # Billing management endpoints
├── guards/
│   └── admin-auth.guard.ts  # Extends AuthGuard('admin-jwt')
├── strategies/
│   └── admin-jwt.strategy.ts # JWT validation with blacklist check
├── entities/
│   ├── admin.entity.ts      # Admin entity (needs role column)
│   └── admin-mfa.entity.ts  # MFA configuration
└── dto/
    ├── admin-jwt-payload.dto.ts # JWT payload (needs role claim)
    └── ...
```

### Recommended Project Structure Changes
```
api/src/modules/admin/
├── decorators/
│   └── admin-roles.decorator.ts   # NEW: @AdminRoles() decorator
├── guards/
│   ├── admin-auth.guard.ts        # EXISTING
│   └── admin-roles.guard.ts       # NEW: AdminRolesGuard
├── enums/
│   └── admin-role.enum.ts         # NEW: AdminRole enum
└── ... (existing files)
```

### Pattern 1: Admin Role Enum (Hardcoded)
**What:** Define roles as TypeScript enum for type safety
**When to use:** Always - compile-time safety, no database queries
**Example:**
```typescript
// Source: NestJS best practices, existing codebase pattern
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

// Role hierarchy for permission checking
export const ADMIN_ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.SUPER_ADMIN]: 3,
  [AdminRole.ADMIN]: 2,
  [AdminRole.VIEWER]: 1,
};
```

### Pattern 2: Admin Roles Decorator
**What:** Custom decorator to attach required roles to handlers
**When to use:** On every admin endpoint that needs role protection
**Example:**
```typescript
// Source: Existing codebase pattern from api/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../enums/admin-role.enum';

export const ADMIN_ROLES_KEY = 'admin_roles';
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
```

### Pattern 3: Admin Roles Guard
**What:** Guard that checks JWT role against required roles
**When to use:** Applied after AdminAuthGuard
**Example:**
```typescript
// Source: NestJS docs + existing RolesGuard pattern
@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no roles specified, allow access (must document this default)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException('Admin role not found in token');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Requires ${requiredRoles.join(' or ')} role`
      );
    }

    return true;
  }
}
```

### Pattern 4: Combined Guard Usage
**What:** Stack AdminAuthGuard + AdminRolesGuard
**When to use:** On protected endpoints
**Example:**
```typescript
// Apply at controller level for all endpoints
@Controller('admin')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
export class AdminController {

  // Read endpoints - all roles can access
  @Get('tenants/search')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.VIEWER)
  async searchTenants() { ... }

  // Write endpoints - admin+ only
  @Post('msp/tenants')
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  async createMspTenant() { ... }

  // Super admin only
  @Post('admins')
  @AdminRoles(AdminRole.SUPER_ADMIN)
  async createAdmin() { ... }
}
```

### Anti-Patterns to Avoid
- **Checking roles in service methods:** Keep authorization in guards, not business logic
- **Using string literals for roles:** Always use the enum for type safety
- **Forgetting AdminRolesGuard in guard chain:** Must come after AdminAuthGuard
- **JWT-only role check without database verification for sensitive ops:** For role changes, verify current role in database

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role hierarchy checking | Custom comparison logic | Simple hierarchy map with numeric values | Edge cases with custom logic |
| Metadata attachment | Manual request property | SetMetadata + Reflector | Framework standard, type-safe |
| Guard composition | Single monolithic guard | Separate AuthGuard + RolesGuard | Single responsibility, testable |
| Session invalidation | Custom Redis logic | Existing AdminSessionService | Already handles blacklisting |

**Key insight:** The existing codebase has all the patterns needed. Adapt the tenant RBAC pattern for admin context rather than building from scratch.

## Common Pitfalls

### Pitfall 1: Guard Order Matters
**What goes wrong:** AdminRolesGuard runs before AdminAuthGuard, user is undefined
**Why it happens:** Guards execute in declaration order
**How to avoid:** Always declare `@UseGuards(AdminAuthGuard, AdminRolesGuard)`
**Warning signs:** "Cannot read property 'role' of undefined" errors

### Pitfall 2: JWT Role Stale After Change
**What goes wrong:** Admin's role is changed but old JWT still has old role
**Why it happens:** JWT payload is immutable once issued
**How to avoid:** Option A: Invalidate all sessions on role change (recommended), Option B: Check database for sensitive operations
**Warning signs:** Admin can still perform actions after role downgrade

### Pitfall 3: Last Super Admin Deletion
**What goes wrong:** Only super_admin demotes themselves or gets deleted
**Why it happens:** No guard against becoming admin-less
**How to avoid:** Before any super_admin role change/deletion, count remaining super_admins
**Warning signs:** 403 on all admin operations, system lockout

### Pitfall 4: Self-Escalation
**What goes wrong:** Admin changes their own role to super_admin
**Why it happens:** No check that target !== requester when elevating
**How to avoid:** Explicit check in role change logic: cannot elevate own role
**Warning signs:** Unauthorized privilege escalation

### Pitfall 5: Migration Without Initial Super Admin
**What goes wrong:** Role column added but no existing admin has super_admin
**Why it happens:** Migration sets default to 'admin' but no super_admin exists
**How to avoid:** Migration must either: set first admin to super_admin, or use env var to designate
**Warning signs:** No one can create new admins or perform super_admin actions

### Pitfall 6: Decorator Not Applied
**What goes wrong:** Endpoint accessible to all authenticated admins
**Why it happens:** Forgot @AdminRoles decorator, guard allows by default
**How to avoid:** Default policy: require at least viewer role, log unannotated endpoints
**Warning signs:** Viewer can access mutating endpoints

## Code Examples

Verified patterns from official sources and existing codebase:

### Admin Entity with Role Column
```typescript
// Source: Existing admin.entity.ts + new role column
import { AdminRole } from '../enums/admin-role.enum';

@Entity('admins')
export class Admin extends BaseEntity {
  // ... existing columns ...

  @Column({
    type: 'varchar',
    length: 20,
    default: 'admin',
    enum: AdminRole
  })
  role: AdminRole;
}
```

### Updated JWT Payload
```typescript
// Source: Existing admin-jwt-payload.dto.ts + role claim
export interface AdminJwtPayload {
  sub: string;
  email: string;
  name: string;
  iss: string;
  jti: string;
  mfaVerified: boolean;
  role: AdminRole;  // NEW
  iat?: number;
  exp?: number;
}

export interface AdminUser {
  adminId: string;
  email: string;
  name: string;
  mfaVerified: boolean;
  jti: string;
  role: AdminRole;  // NEW
}
```

### Self-Escalation Prevention
```typescript
// Source: Security best practice
async updateAdminRole(
  requesterId: string,
  targetId: string,
  newRole: AdminRole,
): Promise<void> {
  const requester = await this.findById(requesterId);

  // Prevent self-escalation
  if (requesterId === targetId) {
    const currentRole = requester.role;
    if (ADMIN_ROLE_HIERARCHY[newRole] > ADMIN_ROLE_HIERARCHY[currentRole]) {
      throw new ForbiddenException('Cannot escalate your own role');
    }
  }

  // Prevent last super_admin demotion
  if (requester.role === AdminRole.SUPER_ADMIN && newRole !== AdminRole.SUPER_ADMIN) {
    const superAdminCount = await this.adminRepository.count({
      where: { role: AdminRole.SUPER_ADMIN },
    });
    if (superAdminCount <= 1) {
      throw new ForbiddenException('Cannot demote the last super_admin');
    }
  }

  await this.adminRepository.update(targetId, { role: newRole });

  // Invalidate all sessions for the target admin
  await this.adminSessionService.revokeAllSessions(targetId);
}
```

### Role-Based Endpoint Classification
```typescript
// Source: Context decisions + security best practices

// Super Admin Only:
// - Create/delete admins
// - Change admin roles
// - Emergency break-glass operations
// - System configuration changes

// Admin (and Super Admin):
// - All GET endpoints
// - MSP tenant creation
// - Impersonation
// - Billing operations (credits, tier changes)
// - Trial/grace period extensions

// Viewer (read-only):
// - GET tenants/search
// - GET msp/tenants
// - GET msp/tenants/:id
// - GET msp/tenants/:id/clients
// - GET system/health
// - GET system/errors
// - GET system/query-volume
// - GET tenants/:id/billing/subscription
// - GET tenants/:id/billing/invoices
// - GET tenants/:id/billing/payment-methods
```

### Break-Glass Super Admin CLI Command
```typescript
// Source: Common emergency recovery pattern
// api/src/scripts/create-super-admin.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminService } from '../modules/admin/admin.service';
import * as bcrypt from 'bcrypt';

async function createBreakGlassAdmin() {
  const email = process.env.BREAK_GLASS_EMAIL;
  const password = process.env.BREAK_GLASS_PASSWORD;

  if (!email || !password) {
    console.error('BREAK_GLASS_EMAIL and BREAK_GLASS_PASSWORD required');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);

  // Check if super_admin exists
  const existingSuperAdmin = await adminService.findByRole(AdminRole.SUPER_ADMIN);
  if (existingSuperAdmin.length > 0) {
    console.error('Super admin already exists. Use admin UI for management.');
    process.exit(1);
  }

  // Create emergency super_admin
  const passwordHash = await bcrypt.hash(password, 12);
  await adminService.createAdmin({
    email,
    name: 'Break Glass Admin',
    passwordHash,
    role: AdminRole.SUPER_ADMIN,
    status: 'pending_mfa',
  });

  console.log(`Break-glass super_admin created: ${email}`);
  console.log('IMPORTANT: Change password and enable MFA immediately!');

  await app.close();
}

createBreakGlassAdmin();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String roles | Enum roles | NestJS 8+ | Type safety |
| Manual metadata | SetMetadata + Reflector | Always | Framework standard |
| Single auth guard | Auth + Roles guards | Best practice | Separation of concerns |
| Role in DB only | Role in JWT + DB verification for sensitive ops | Current | Performance vs security balance |

**Deprecated/outdated:**
- `@nestjs/passport` version 9 and below: Upgrade to 10+ for latest features
- Hardcoded role strings in guards: Use enum constants

## Open Questions

Things that couldn't be fully resolved:

1. **Session invalidation timing on role downgrade**
   - What we know: Can invalidate immediately or on next login
   - What's unclear: Business preference for UX vs security
   - Recommendation: Invalidate immediately (security over convenience)

2. **Unannotated endpoint default policy**
   - What we know: Guard can allow or deny by default
   - What's unclear: Best balance between security and development friction
   - Recommendation: Require at least one role (viewer minimum), log warnings for unannotated

3. **Viewer access to sensitive billing data**
   - What we know: Viewers need read access but some billing data is sensitive
   - What's unclear: Exact boundaries for viewer access
   - Recommendation: Allow all GET billing endpoints for viewers (they're already admins)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `api/src/modules/admin/` - Full admin auth implementation
- Existing codebase: `api/src/common/guards/roles.guard.ts` - Tenant RBAC pattern
- [NestJS Authorization Documentation](https://docs.nestjs.com/security/authorization) - Official patterns

### Secondary (MEDIUM confidence)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards) - Guard execution order
- [Role Based Access Control in NestJS](https://medium.com/@dev.muhammet.ozen/role-based-access-control-in-nestjs-15c15090e47d) - Community pattern
- [NestJS RBAC Best Practices 2025](https://medium.com/@jobayer6735/role-based-access-control-in-nestjs-three-production-ready-approaches-by-jobayer-ahmed-6343197bab3b) - Production approaches
- [Understanding Guards in NestJS](https://blog.logrocket.com/understanding-guards-nestjs/) - Guard patterns

### Tertiary (LOW confidence)
- None required - codebase patterns are well-established

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase patterns
- Architecture: HIGH - Following NestJS official patterns
- Pitfalls: HIGH - Based on documented security issues
- Code examples: HIGH - Adapted from existing codebase

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days - stable patterns)

---

## Implementation Notes for Planner

### Existing Infrastructure Summary
1. **Admin Entity** (`admin.entity.ts`): Needs `role` column added
2. **Admin JWT Payload** (`admin-jwt-payload.dto.ts`): Needs `role` claim
3. **Admin JWT Strategy** (`admin-jwt.strategy.ts`): Needs to include role in returned AdminUser
4. **Admin Service** (`admin.service.ts`): Needs role in token generation
5. **Admin Controller** (`admin.controller.ts`): 24 endpoints need @AdminRoles decorators

### Endpoint Count by HTTP Method
- POST endpoints: 12 (login, logout, MSP create, impersonation, billing ops, etc.)
- GET endpoints: 10 (search, list, details, health, billing reads)
- PATCH endpoints: 1 (set default payment method)
- DELETE endpoints: 1 (delete payment method)

### Migration Considerations
- Existing admins table has no role column
- Migration must add column with default value
- Either set all existing admins to 'admin' and manually promote one to super_admin
- Or use env var `INITIAL_SUPER_ADMIN_EMAIL` to auto-promote during migration

### Audit Logging
- AuditLogsService exists with hash-chain integrity
- New audit actions needed: `admin_role_changed`
- Log format: who changed whose role, from what to what, when
