# Phase 3: Impersonation Core - Research

**Researched:** 2026-01-17
**Domain:** Admin tenant impersonation with JWT token generation
**Confidence:** HIGH

## Summary

Phase 3 implements the core impersonation functionality, allowing internal admins to access any tenant's dashboard as if they were the tenant admin. This is architecturally similar to the existing MSP context switching (US-007) but with key differences: the actor is an admin (not a tenant user), and the target is any tenant (not just managed clients).

The codebase already has a proven pattern for context switching in `msp.service.ts` which generates new JWT tokens scoped to a target tenant while preserving the original identity in special claims. The admin impersonation feature will follow this pattern but use:
- Admin identity (from `nebula-admin` issuer token) as the actor
- Impersonation-specific JWT claims (`impersonatingAdminId`, `impersonatingAdminEmail`)
- New audit action types for impersonation events
- Tenant JWT (not admin JWT) for accessing tenant endpoints

**Primary recommendation:** Create an impersonation service that generates tenant-scoped JWT tokens (using `JWT_SECRET`) with embedded admin attribution claims. The token grants `admin` role access to the target tenant's endpoints, while preserving the admin's identity for audit purposes. End impersonation by blacklisting the impersonation token and returning to the admin dashboard.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/jwt` | 10.2.0 | JWT token generation | Already in use for both admin and tenant tokens |
| `passport-jwt` | 4.0.1 | JWT extraction and validation | Already in use |
| `uuid` | 9.x | JTI generation for token tracking | Already in use |
| `class-validator` | 0.14.x | DTO validation | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ioredis` | 5.3.2 | Token blacklist for session end | Already in use via SessionService |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tenant JWT with admin claims | Admin JWT with tenant access | Tenant JWT required - existing tenant guards expect tenant JWT structure |
| Impersonation token | Proxy all requests | Token approach simpler, stateless, matches MSP pattern |
| Session-based impersonation | Token-based | Token matches existing architecture, allows frontend to use same auth flow |

**Installation:**
```bash
# No new packages needed - all dependencies already in place
```

## Architecture Patterns

### Recommended Project Structure
```
api/src/modules/admin/
├── admin.controller.ts        # Add impersonation endpoints
├── admin.service.ts           # Add impersonation methods (or separate service)
├── dto/
│   ├── impersonation.dto.ts   # NEW: Start/end impersonation DTOs
│   └── ...existing...
└── ...existing files...

api/src/modules/auth/
├── jwt.strategy.ts            # UPDATE: Add impersonation claim handling
└── ...existing files...
```

### Pattern 1: Impersonation Token Structure

**What:** Generate a tenant JWT token with special claims identifying the impersonating admin.

**When to use:** When admin starts impersonation session.

**Example:**
```typescript
// Based on MSP context switch pattern from msp.service.ts
interface ImpersonationJwtPayload {
  sub: string;           // Admin's ID (acting as synthetic user)
  email: string;         // Admin's email
  tenantId: string;      // Target tenant's ID
  role: 'admin';         // Full admin access to tenant
  jti: string;           // For session tracking/blacklist
  mfaVerified: boolean;  // Inherit from admin session
  iss: 'nebula-dns';     // Tenant issuer (NOT nebula-admin)

  // Impersonation-specific claims
  impersonatingAdminId: string;     // Admin's ID for attribution
  impersonatingAdminEmail: string;  // Admin's email for audit
  impersonationStartTime: number;   // Unix timestamp for duration tracking
}
```

### Pattern 2: Start Impersonation Flow

**What:** Admin provides tenant ID, service validates and generates impersonation token.

**When to use:** `POST /admin/impersonate/:tenantId`

**Example:**
```typescript
// Following pattern from MspService.switchToClient()
async startImpersonation(
  adminUser: AdminUser,
  tenantId: string,
  ipAddress?: string,
): Promise<ImpersonationResponseDto> {
  // Verify tenant exists
  const tenant = await this.tenantRepository.findOne({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  // Generate impersonation token (uses tenant JWT_SECRET, not admin secret)
  const jti = uuidv4();
  const payload = {
    sub: adminUser.adminId,  // Admin ID as subject
    email: adminUser.email,
    tenantId: tenant.id,
    role: 'admin',           // Full tenant admin access
    jti,
    mfaVerified: true,       // Admin already MFA verified
    // Impersonation claims
    impersonatingAdminId: adminUser.adminId,
    impersonatingAdminEmail: adminUser.email,
    impersonationStartTime: Math.floor(Date.now() / 1000),
  };

  // Sign with tenant secret (so JwtStrategy validates it)
  const impersonationToken = this.jwtService.sign(payload, {
    secret: this.configService.get('JWT_SECRET'),
    expiresIn: '1h',  // Shorter duration for impersonation
    issuer: 'nebula-dns',  // Tenant issuer
  });

  // Audit log the start
  await this.auditLogsService.log({
    tenantId: tenant.id,
    userId: null,  // No tenant user, it's admin
    action: 'admin_impersonation_start',
    resourceType: 'tenant',
    resourceId: tenant.id,
    resourceName: tenant.name,
    ipAddress,
    metadata: {
      adminId: adminUser.adminId,
      adminEmail: adminUser.email,
      tenantName: tenant.name,
      tenantTier: tenant.tier,
    },
  });

  return {
    accessToken: impersonationToken,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantTier: tenant.tier,
    expiresIn: 3600,  // 1 hour
  };
}
```

### Pattern 3: End Impersonation Flow

**What:** Blacklist the impersonation token and log the end event.

**When to use:** `POST /admin/impersonate/end` or when admin navigates back

**Example:**
```typescript
// Admin must present impersonation token to end session
async endImpersonation(
  impersonationToken: string,
  ipAddress?: string,
): Promise<void> {
  // Verify and decode the impersonation token
  const payload = this.jwtService.verify(impersonationToken, {
    secret: this.configService.get('JWT_SECRET'),
  });

  // Validate it's an impersonation token
  if (!payload.impersonatingAdminId) {
    throw new BadRequestException('Not an impersonation token');
  }

  // Blacklist the token
  await this.sessionService.blacklistToken(payload.jti);

  // Calculate session duration
  const startTime = payload.impersonationStartTime || 0;
  const endTime = Math.floor(Date.now() / 1000);
  const durationSeconds = endTime - startTime;

  // Audit log the end
  await this.auditLogsService.log({
    tenantId: payload.tenantId,
    userId: null,
    action: 'admin_impersonation_end',
    resourceType: 'tenant',
    resourceId: payload.tenantId,
    ipAddress,
    metadata: {
      adminId: payload.impersonatingAdminId,
      adminEmail: payload.impersonatingAdminEmail,
      durationSeconds,
      startTime: new Date(startTime * 1000).toISOString(),
      endTime: new Date(endTime * 1000).toISOString(),
    },
  });
}
```

### Pattern 4: JwtStrategy Update for Impersonation Awareness

**What:** Update JwtStrategy to recognize impersonation tokens and handle validation.

**When to use:** All tenant endpoints need to work with impersonation tokens.

**Example:**
```typescript
// Update existing jwt.strategy.ts
async validate(payload: JwtPayload) {
  // Existing blacklist check
  if (payload.jti) {
    const isBlacklisted = await this.authService.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Session has been revoked');
    }
  }

  // Handle impersonation tokens - admin acts as synthetic user
  if (payload.impersonatingAdminId) {
    // No need to validate user in database - admin is impersonating
    return {
      id: payload.sub,  // Admin ID
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
      jti: payload.jti,
      mfaVerified: payload.mfaVerified,
      // Impersonation context
      isImpersonation: true,
      impersonatingAdminId: payload.impersonatingAdminId,
      impersonatingAdminEmail: payload.impersonatingAdminEmail,
    };
  }

  // Normal user validation (existing code)
  const validationTenantId = payload.mspParentTenantId || payload.tenantId;
  const user = await this.authService.validateUser(payload.sub, validationTenantId);
  // ... rest of existing code
}
```

### Pattern 5: Audit Action Types for Impersonation

**What:** Add new audit action types specifically for impersonation events.

**When to use:** All impersonation start/end events.

**Example:**
```typescript
// Update audit-log.entity.ts AuditAction type
export type AuditAction =
  | ... existing actions ...
  | 'admin_impersonation_start'  // Admin started impersonating tenant
  | 'admin_impersonation_end';   // Admin ended impersonation session
```

### Anti-Patterns to Avoid
- **Using admin JWT for tenant endpoints:** Tenant guards expect tenant JWT structure
- **Modifying admin's real identity:** Impersonation should be tracked, not hidden
- **Infinite impersonation duration:** Use shorter TTL (1 hour) than normal sessions
- **Forgetting to blacklist on end:** Token could be reused after "end" action
- **Logging only start event:** Both start AND end must be audit-logged

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token generation | Custom JWT signing | JwtService.sign() | Consistent with codebase |
| Token blacklisting | Custom blacklist | SessionService.blacklistToken() | Already implemented |
| Audit logging | Direct SQL inserts | AuditLogsService.log() | Hash chain integrity |
| UUID generation | Math.random() | uuid v4 | Cryptographically secure |

**Key insight:** The MSP context switch pattern in `msp.service.ts` is nearly identical to impersonation. The main differences are the actor (admin vs MSP user) and the access scope (any tenant vs managed clients only).

## Common Pitfalls

### Pitfall 1: Using Wrong JWT Secret
**What goes wrong:** Impersonation token rejected by tenant endpoints
**Why it happens:** Signing with ADMIN_JWT_SECRET instead of JWT_SECRET
**How to avoid:** Explicitly pass `secret: configService.get('JWT_SECRET')` to sign()
**Warning signs:** 401 errors on tenant endpoints with impersonation token

### Pitfall 2: Missing Impersonation Context in Request
**What goes wrong:** Audit logs show wrong actor, security attribution fails
**Why it happens:** Not propagating impersonation claims through request.user
**How to avoid:** JwtStrategy must set isImpersonation and admin ID on validated user
**Warning signs:** Tenant audit logs show admin ID as regular user

### Pitfall 3: Impersonation Token Not Blacklisted on End
**What goes wrong:** Token remains valid after admin "ends" impersonation
**Why it happens:** Only logging end event, forgetting blacklist call
**How to avoid:** Always call sessionService.blacklistToken(jti) before audit log
**Warning signs:** Old impersonation tokens still work on tenant endpoints

### Pitfall 4: Audit Log in Wrong Tenant Scope
**What goes wrong:** Impersonation events not visible in tenant's audit log
**Why it happens:** Logging under admin's non-existent tenant context
**How to avoid:** Use target tenant's ID for tenantId in audit log
**Warning signs:** Cannot find impersonation events in tenant's audit log

### Pitfall 5: Infinite Impersonation Duration
**What goes wrong:** Security risk if admin forgets to end session
**Why it happens:** Using same 8-hour TTL as admin tokens
**How to avoid:** Use shorter TTL (1 hour) for impersonation tokens
**Warning signs:** Very long impersonation durations in audit logs

### Pitfall 6: Admin Can Impersonate While Impersonating
**What goes wrong:** Nested impersonation creates confusion
**Why it happens:** Not checking if current token is already impersonation
**How to avoid:** Require admin JWT (not impersonation JWT) to start impersonation
**Warning signs:** impersonatingAdminId chains or confusion about true actor

## Code Examples

Verified patterns from official sources:

### Impersonation DTOs
```typescript
// api/src/modules/admin/dto/impersonation.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class StartImpersonationResponseDto {
  @ApiProperty({ description: 'JWT token scoped to target tenant' })
  accessToken: string;

  @ApiProperty({ description: 'Target tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'Target tenant name' })
  tenantName: string;

  @ApiProperty({ enum: ['home', 'enterprise', 'msp'] })
  tenantTier: string;

  @ApiProperty({ description: 'Token expiration in seconds' })
  expiresIn: number;
}

export class EndImpersonationResponseDto {
  @ApiProperty({ description: 'Confirmation message' })
  message: string;

  @ApiProperty({ description: 'Session duration in seconds' })
  durationSeconds: number;
}
```

### Controller Endpoints
```typescript
// Add to api/src/modules/admin/admin.controller.ts
@Post('impersonate/:tenantId')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({
  summary: 'Start impersonation session',
  description: 'Generate a token to access target tenant as admin',
})
@ApiResponse({ status: 200, type: StartImpersonationResponseDto })
@ApiResponse({ status: 404, description: 'Tenant not found' })
@ApiResponse({ status: 401, description: 'Admin authentication required' })
async startImpersonation(
  @Param('tenantId') tenantId: string,
  @Req() req: Request,
  @Ip() ip: string,
): Promise<StartImpersonationResponseDto> {
  const adminUser = req.user as AdminUser;
  return this.adminService.startImpersonation(
    adminUser,
    tenantId,
    this.getClientIp(req, ip),
  );
}

@Post('impersonate/end')
@HttpCode(HttpStatus.OK)
@ApiBearerAuth()  // Uses tenant JWT (impersonation token)
@ApiOperation({
  summary: 'End impersonation session',
  description: 'Blacklist impersonation token and return to admin context',
})
@ApiResponse({ status: 200, type: EndImpersonationResponseDto })
@ApiResponse({ status: 400, description: 'Not an impersonation token' })
async endImpersonation(
  @Req() req: Request,
  @Ip() ip: string,
): Promise<EndImpersonationResponseDto> {
  // Extract token from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new UnauthorizedException('No token provided');
  }
  return this.adminService.endImpersonation(token, this.getClientIp(req, ip));
}
```

### JwtPayload Interface Update
```typescript
// Update api/src/modules/auth/jwt.strategy.ts
export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  jti?: string;
  mfaVerified?: boolean;
  // MSP context switch claims (US-007)
  mspParentTenantId?: string;
  mspUserId?: string;
  tier?: string;
  // NEW: Impersonation claims
  impersonatingAdminId?: string;
  impersonatingAdminEmail?: string;
  impersonationStartTime?: number;
}
```

### Validated User with Impersonation Context
```typescript
// Return type from JwtStrategy.validate() when impersonating
interface ValidatedUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  jti?: string;
  mfaVerified: boolean;
  // MSP context
  mspParentTenantId?: string;
  mspUserId?: string;
  tier?: string;
  // Impersonation context
  isImpersonation?: boolean;
  impersonatingAdminId?: string;
  impersonatingAdminEmail?: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Admin proxy requests | Token-based impersonation | Current best practice | Stateless, consistent UX |
| Single admin JWT | Separate impersonation token | Security requirement | Clear audit trail |

**Deprecated/outdated:**
- Session-based impersonation with cookies: Token-based approach is more consistent with existing architecture

## Open Questions

Things that couldn't be fully resolved:

1. **Impersonation Token Duration**
   - What we know: Must be shorter than admin session (8h)
   - What's unclear: Exact duration (30min, 1h, 2h?)
   - Recommendation: 1 hour - long enough for support work, short enough for security

2. **Simultaneous Impersonation Sessions**
   - What we know: Admin could open multiple browser tabs
   - What's unclear: Should we limit to one active impersonation per admin?
   - Recommendation: Allow multiple (different tenants) - simplifies implementation, admin can switch quickly

3. **Impersonation During Actions**
   - What we know: Admin might be mid-action when token expires
   - What's unclear: Should frontend warn before expiry?
   - Recommendation: Frontend should track expiry and warn at 5 minutes remaining (Phase 4 UI concern)

4. **End Impersonation Authentication**
   - What we know: Current pattern uses impersonation token itself
   - What's unclear: Should we require admin token instead?
   - Recommendation: Use impersonation token - simpler, token is blacklisted anyway

## Sources

### Primary (HIGH confidence)
- `api/src/modules/msp/msp.service.ts` - MSP context switch pattern (lines 426-511)
- `api/src/modules/auth/jwt.strategy.ts` - JWT validation with MSP claims
- `api/src/modules/admin/admin.service.ts` - Admin service patterns
- `api/src/modules/admin/strategies/admin-jwt.strategy.ts` - Admin JWT strategy
- `api/src/modules/audit-logs/audit-logs.service.ts` - Audit logging pattern
- `api/src/modules/auth/auth.service.ts` - Token generation patterns

### Secondary (MEDIUM confidence)
- NestJS JWT documentation for token signing with custom claims

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use in codebase
- Architecture: HIGH - Follows existing MSP context switch pattern closely
- Pitfalls: HIGH - Based on real implementation in msp.service.ts

**Research date:** 2026-01-17
**Valid until:** 60 days (stable NestJS/JWT patterns, codebase-specific)
