# Phase 1: Admin Auth Foundation - Research

**Researched:** 2026-01-17
**Domain:** NestJS Authentication / Separate Admin System
**Confidence:** HIGH

## Summary

This phase implements a completely separate authentication system for internal admin users. The existing codebase already has a robust tenant JWT authentication system using `@nestjs/passport` and `@nestjs/jwt`. The admin auth system will run in parallel, using a separate database table (`admins`), separate JWT strategy with a distinct issuer claim (`iss: 'nebula-admin'`), and dedicated route prefix (`/api/admin/*`).

The research confirms that NestJS Passport natively supports multiple named JWT strategies, allowing complete separation between tenant auth (`jwt` strategy) and admin auth (`admin-jwt` strategy). The existing patterns in the codebase (MspTierGuard, RolesGuard, SessionService) provide solid templates for implementing AdminAuthGuard.

**Primary recommendation:** Create a dedicated `AdminModule` with its own `AdminJwtStrategy` (named `'admin-jwt'`), separate `admins` table entity, and `AdminAuthGuard` that enforces the admin issuer claim. Reuse the existing MFA and session patterns but with admin-specific Redis key prefixes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/passport` | 10.0.3 | Strategy-based authentication framework | Already in use, supports named strategies |
| `@nestjs/jwt` | 10.2.0 | JWT token signing/verification | Already in use, can use multiple secrets |
| `passport-jwt` | 4.0.1 | JWT extraction and validation | Already in use |
| `bcrypt` | 5.1.1 | Password hashing | Already in use for tenant users |
| `class-validator` | 0.14.x | DTO validation with `@IsStrongPassword` | Already in use |
| `otplib` | 12.0.1 | TOTP MFA | Already implemented in MfaService |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ioredis` | 5.3.2 | Session storage and blacklist | Already in use via RedisService |
| `uuid` | 9.x | Session and token JTI generation | Already in use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate JWT strategy | Role claim in same JWT | Less secure - single compromised secret exposes both systems |
| Database table for admins | Environment variables | Can't scale, no individual identity for audit |
| Redis sessions | Database sessions | Redis is faster, already used for tenant sessions |

**Installation:**
No new packages required. All dependencies already present in `api/package.json`.

## Architecture Patterns

### Recommended Project Structure
```
api/src/modules/admin/
├── admin.module.ts           # AdminModule with JwtModule config
├── admin.controller.ts       # Login/logout/session endpoints
├── admin.service.ts          # Admin authentication logic
├── admin-session.service.ts  # Admin-specific session management
├── dto/
│   ├── admin-login.dto.ts    # Login DTO with strong password validation
│   └── admin.dto.ts          # Response DTOs
├── entities/
│   └── admin.entity.ts       # Admin entity (extends BaseEntity, NOT TenantScoped)
├── guards/
│   ├── admin-auth.guard.ts   # AdminAuthGuard using AuthGuard('admin-jwt')
│   └── admin-mfa.guard.ts    # Guard ensuring MFA is complete
└── strategies/
    └── admin-jwt.strategy.ts # Named strategy 'admin-jwt' with issuer validation
```

### Pattern 1: Named Passport Strategy for Admin JWT

**What:** Create a separate JWT strategy named `'admin-jwt'` that validates tokens with the admin-specific issuer claim.

**When to use:** All admin-protected routes via `AdminAuthGuard`.

**Example:**
```typescript
// Source: NestJS Passport docs + GitHub nestjs/passport
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface AdminJwtPayload {
  sub: string;        // admin_id
  email: string;
  name: string;
  iss: string;        // Must be 'nebula-admin'
  jti: string;        // For session tracking/blacklist
  mfaVerified: boolean;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminService: AdminService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ADMIN_JWT_SECRET'), // Separate secret
      issuer: 'nebula-admin', // Validate issuer claim
    });
  }

  async validate(payload: AdminJwtPayload) {
    // Reject tokens without correct issuer
    if (payload.iss !== 'nebula-admin') {
      throw new UnauthorizedException('Admin authentication required');
    }

    // Check if token is blacklisted
    const isBlacklisted = await this.adminService.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Session has been revoked');
    }

    // Verify admin still exists and is active
    const admin = await this.adminService.findById(payload.sub);
    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('Admin not found or inactive');
    }

    return {
      adminId: payload.sub,
      email: payload.email,
      name: payload.name,
      mfaVerified: payload.mfaVerified,
    };
  }
}
```

### Pattern 2: Admin Auth Guard

**What:** Custom guard that wraps `AuthGuard('admin-jwt')` and returns appropriate error message.

**When to use:** Applied to all `/api/admin/*` routes.

**Example:**
```typescript
// Source: Existing MspTierGuard pattern in codebase
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {
  handleRequest(err: any, user: any, info: any) {
    // Return specific error message as per CONTEXT.md decision
    if (err || !user) {
      throw new UnauthorizedException('Admin authentication required');
    }
    return user;
  }
}
```

### Pattern 3: Admin Entity (Non-Tenant-Scoped)

**What:** Admins are global system users, not scoped to any tenant. They have no `tenant_id`.

**When to use:** Admin table design.

**Example:**
```typescript
// Source: Existing BaseEntity pattern + User entity pattern
import { Entity, Column } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@/common/entities/base.entity';

export type AdminStatus = 'active' | 'suspended' | 'pending_mfa';

@Entity('admins')
export class Admin extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'pending_mfa' })
  status: AdminStatus;

  @Column({ name: 'mfa_setup_complete', type: 'boolean', default: false })
  mfaSetupComplete: boolean;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  @Exclude()
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  @Exclude()
  lockedUntil: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'invited_by_admin_id', type: 'uuid', nullable: true })
  invitedByAdminId: string | null;
}
```

### Pattern 4: Separate Admin Session Keys in Redis

**What:** Use different Redis key prefixes for admin sessions to ensure complete isolation.

**When to use:** All admin session operations.

**Example:**
```typescript
// Source: Existing SessionService pattern
const ADMIN_REDIS_KEYS = {
  SESSION: 'admin:session',           // admin:session:{admin_id}:{session_id}
  BLACKLIST: 'admin:session:blacklist', // admin:session:blacklist:{jti}
  ADMIN_SESSIONS: 'admin:session:admin', // admin:session:admin:{admin_id}
} as const;
```

### Anti-Patterns to Avoid
- **Sharing JWT secrets between tenant and admin:** Compromises security isolation
- **Using tenant_id in admin entity:** Admins are global, not tenant-scoped
- **Allowing admin access without MFA setup:** CONTEXT.md requires MFA from day one
- **Using same Redis key prefix:** Could cause collisions with tenant sessions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `bcrypt` with cost 12 | Already proven, timing-safe comparison |
| TOTP generation | Custom implementation | Existing `MfaService` | Already handles TOTP correctly |
| Session storage | Database sessions | Redis via `SessionService` pattern | Fast, TTL built-in, already proven |
| Password strength | Regex validation | `@IsStrongPassword` from class-validator | Configurable, industry standard |
| User agent parsing | Custom parser | `SessionService.parseDeviceInfo()` | Already implemented |

**Key insight:** The codebase already has battle-tested implementations for MFA, sessions, and password hashing. The admin system should reuse these patterns with admin-specific Redis key prefixes.

## Common Pitfalls

### Pitfall 1: Forgetting to Register Named Strategy
**What goes wrong:** AdminJwtStrategy not found at runtime
**Why it happens:** NestJS Passport requires strategy to be provided in module
**How to avoid:** Include `AdminJwtStrategy` in `AdminModule` providers array
**Warning signs:** Error "Unknown authentication strategy 'admin-jwt'"

### Pitfall 2: JWT Secret Collision
**What goes wrong:** Tenant JWT accepted on admin routes
**Why it happens:** Both strategies use same `JWT_SECRET` environment variable
**How to avoid:** Use separate `ADMIN_JWT_SECRET` with different issuer claim validation
**Warning signs:** Tenant tokens work on `/api/admin/*` routes

### Pitfall 3: Admin Token Works After Revocation
**What goes wrong:** Blacklisted token still validates
**Why it happens:** Strategy doesn't check blacklist before returning user
**How to avoid:** Always check `isTokenBlacklisted(payload.jti)` in `validate()` method
**Warning signs:** Logging out doesn't invalidate session

### Pitfall 4: MFA Bypass on Initial Login
**What goes wrong:** Admin can access protected routes without completing MFA
**Why it happens:** MFA check missing in guard chain
**How to avoid:** Use status `'pending_mfa'` until MFA complete, check in `validate()`
**Warning signs:** New admin can access dashboard before MFA setup

### Pitfall 5: Failed Login Tracking Not Persisted
**What goes wrong:** Account lockout resets on application restart
**Why it happens:** Tracking failed attempts in memory only
**How to avoid:** Store `failedLoginAttempts` and `lockedUntil` in database (as in User entity)
**Warning signs:** Lockout doesn't persist across restarts

### Pitfall 6: Session Duration Mismatch
**What goes wrong:** 8-hour session promised but token expires in 15 minutes
**Why it happens:** Using tenant JWT expiry settings
**How to avoid:** Configure separate expiry in AdminModule JwtModule: `expiresIn: '8h'`
**Warning signs:** Admins forced to re-login frequently

## Code Examples

Verified patterns from official sources and existing codebase:

### Admin Login DTO with Strong Password
```typescript
// Source: class-validator docs + CONTEXT.md requirements
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@nebula-dns.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd123!' })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 14,           // Stricter than tenant (which uses 8)
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  }, {
    message: 'Password must be at least 14 characters with uppercase, lowercase, number, and symbol',
  })
  password: string;
}
```

### AdminModule with Separate JWT Configuration
```typescript
// Source: Existing AuthModule pattern + NestJS JwtModule docs
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminSessionService } from './admin-session.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { Admin } from './entities/admin.entity';
import { AdminMfa } from './entities/admin-mfa.entity'; // Optional: reuse MFA pattern
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn: '8h',  // 8-hour workday as per CONTEXT.md
          issuer: 'nebula-admin',
        },
      }),
    }),
    TypeOrmModule.forFeature([Admin]),
    RedisModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminSessionService, AdminJwtStrategy],
  exports: [AdminService],
})
export class AdminModule {}
```

### Controller with AdminAuthGuard
```typescript
// Source: Existing controller patterns
import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() loginDto: AdminLoginDto, @Req() req: Request) {
    return this.adminService.login(loginDto, {
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || '',
    });
  }

  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  async getProfile(@Req() req: Request) {
    return req['user'];
  }

  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  async logout(@Req() req: Request) {
    return this.adminService.logout(req['user'].adminId, req['user'].jti);
  }
}
```

### Database Migration for Admins Table
```typescript
// Source: Existing migration patterns
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAdminsTable1709000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'admins',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'password_hash', type: 'varchar', length: '255' },
          { name: 'status', type: 'varchar', length: '20', default: "'pending_mfa'" },
          { name: 'mfa_setup_complete', type: 'boolean', default: false },
          { name: 'failed_login_attempts', type: 'int', default: 0 },
          { name: 'locked_until', type: 'timestamp', isNullable: true },
          { name: 'last_login_at', type: 'timestamp', isNullable: true },
          { name: 'invited_by_admin_id', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['invited_by_admin_id'],
            referencedTableName: 'admins',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admins');
  }
}
```

### Seed Migration for First Admin
```typescript
// Source: Existing seed patterns
import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedInitialAdmin1709000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = await bcrypt.hash(
      process.env.INITIAL_ADMIN_PASSWORD || 'ChangeThisPassword123!',
      12,
    );

    await queryRunner.query(`
      INSERT INTO admins (id, email, name, password_hash, status)
      VALUES (
        gen_random_uuid(),
        '${process.env.INITIAL_ADMIN_EMAIL || 'admin@nebula-dns.internal'}',
        'Initial Admin',
        '${passwordHash}',
        'pending_mfa'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM admins WHERE email = 'admin@nebula-dns.internal'`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single JWT for all users | Separate JWT per user type | Current best practice | Better security isolation |
| MFA as optional | MFA required for admin | Current best practice | Required by CONTEXT.md |
| passport.use() in constructor | PassportStrategy named arg | NestJS 7+ | Cleaner DI integration |

**Deprecated/outdated:**
- Using `express-jwt` directly: Use `@nestjs/jwt` with Passport for NestJS integration
- Cookie-based admin sessions: JWT allows stateless validation with Redis blacklist

## Open Questions

Things that couldn't be fully resolved:

1. **Admin MFA: Separate Entity or Reuse UserMfa?**
   - What we know: Existing `UserMfa` entity is tied to `userId`
   - What's unclear: Should admins have separate `AdminMfa` table or add `adminId` nullable column to existing?
   - Recommendation: Create separate `AdminMfa` entity for cleaner separation (admin system completely isolated)

2. **Rate Limiting on Admin Login**
   - What we know: Existing `RedisRateLimitGuard` works for tenant routes
   - What's unclear: Should admin login have stricter rate limits?
   - Recommendation: Apply with stricter limits (e.g., 5 attempts per 15 minutes per IP)

3. **Admin Audit Logging**
   - What we know: Existing `AuditLogsService` is tenant-scoped
   - What's unclear: Should admin actions use same table with null tenant_id or separate table?
   - Recommendation: Defer to Phase 2 (Audit Logging), but design admin identity to be audit-ready

## Sources

### Primary (HIGH confidence)
- Existing codebase: `api/src/modules/auth/jwt.strategy.ts` - Current JWT strategy pattern
- Existing codebase: `api/src/modules/auth/session.service.ts` - Session management pattern
- Existing codebase: `api/src/modules/mfa/mfa.service.ts` - MFA implementation
- Existing codebase: `api/src/modules/msp-clients/guards/msp-tier.guard.ts` - Custom guard pattern
- GitHub: [nestjs/passport PassportStrategy source](https://github.com/nestjs/passport/blob/master/lib/passport/passport.strategy.ts) - Named strategy support

### Secondary (MEDIUM confidence)
- [NestJS Authentication Documentation](https://docs.nestjs.com/security/authentication) - Official patterns
- [NestJS GitHub Issue #705](https://github.com/nestjs/nest/issues/705) - Multiple JWT strategies discussion
- [class-validator @IsStrongPassword](https://github.com/typestack/class-validator) - Password validation

### Tertiary (LOW confidence)
- Medium articles on NestJS admin patterns - General guidance only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already in use in codebase
- Architecture: HIGH - Based on existing codebase patterns (SessionService, MfaService, guards)
- Pitfalls: HIGH - Derived from actual codebase implementation review

**Research date:** 2026-01-17
**Valid until:** 60 days (stable NestJS patterns, codebase-specific)

---

*Phase: 01-admin-auth-foundation*
*Research completed: 2026-01-17*
