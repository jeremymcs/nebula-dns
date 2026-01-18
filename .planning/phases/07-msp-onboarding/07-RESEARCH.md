# Phase 7: MSP Onboarding - Research

**Researched:** 2026-01-17
**Domain:** Admin MSP tenant creation with user provisioning and email notification
**Confidence:** HIGH

## Summary

This phase implements the admin capability to create new MSP tenant accounts from the admin panel. The goal is to allow internal admins to onboard new MSP customers without manual database work. The implementation extends the existing Admin module with new endpoints for MSP tenant creation, initial user provisioning, and welcome email dispatch.

The research confirms strong patterns already exist in the codebase:
1. **MSP Clients Service** (`msp-clients.service.ts`) demonstrates transactional tenant+user creation with temporary password generation
2. **Email Service** already has `sendWelcomeEmail()` for new account notifications
3. **Admin Controller/Service** provides the authenticated context for admin-only operations
4. **Tenant/User entities** support the tier system and all required fields

The key difference from MSP-created clients is that this creates the MSP tenant itself (tier='msp'), not a client tenant (tier='enterprise'). The admin creates both the tenant and its initial owner user in a single transaction.

**Primary recommendation:** Add `createMspTenant()` endpoint to AdminController that:
1. Validates MSP tenant creation DTO (name, slug, contact info, limits)
2. Creates Tenant entity with tier='msp' in transaction
3. Creates initial User entity with role='owner' and temporary password
4. Sends welcome email with temporary credentials and login URL
5. Returns the created MSP tenant details

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `typeorm` | 0.3.x | Database operations with transactions | Already in use, DataSource.createQueryRunner for atomic operations |
| `bcrypt` | 5.1.1 | Password hashing for initial user | Already in use, 12 rounds standard |
| `crypto` | built-in | Random password generation | Already used in msp-clients.service.ts |
| `class-validator` | 0.14.x | DTO validation | Already in use |
| `@sendgrid/mail` | 8.1.x | Email delivery | Already configured in EmailService |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `uuid` | 9.x | Generate UUIDs if needed | Already available |
| `slugify` | built-in pattern | Generate unique slug from name | Pattern exists in msp-clients.service.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Transaction with queryRunner | save() without transaction | Risk of partial creation (tenant without user) |
| Random temporary password | Admin-provided password | Less secure, admin would know password |
| Welcome email with temp password | Invite link with token | More complex, overkill for admin-created accounts |

**Installation:**
No new packages required. All dependencies already present in `api/package.json`.

## Architecture Patterns

### Recommended Project Structure
```
api/src/modules/admin/
├── admin.controller.ts       # Add POST /admin/msp/tenants endpoint
├── admin.service.ts          # Add createMspTenant() method
├── dto/
│   ├── msp-onboarding.dto.ts # NEW: CreateMspTenantDto, MspTenantCreatedResponseDto
│   └── ... existing DTOs
└── ... existing files
```

### Pattern 1: Transactional Tenant + User Creation

**What:** Create both Tenant and User entities in a single database transaction to ensure atomicity.

**When to use:** Any operation that must create multiple related entities that should never exist partially.

**Example:**
```typescript
// Source: Existing msp-clients.service.ts pattern (lines 232-282)
async createMspTenant(dto: CreateMspTenantDto): Promise<MspTenantCreatedResponseDto> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Create tenant
    const tenant = queryRunner.manager.create(Tenant, {
      name: dto.name,
      slug: uniqueSlug,
      status: 'active',
      tier: 'msp',  // Key difference: tier is 'msp' not 'enterprise'
      contactEmail: dto.contactEmail,
      locationLimit: dto.locationLimit,
      clientLimit: dto.clientLimit,
      subscriptionStatus: 'active',
      settings: { timezone: 'UTC', blockPageEnabled: true },
    });
    const savedTenant = await queryRunner.manager.save(tenant);

    // 2. Create owner user
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const adminUser = queryRunner.manager.create(User, {
      tenantId: savedTenant.id,
      email: dto.adminEmail.toLowerCase(),
      name: dto.adminName || `${dto.name} Admin`,
      passwordHash: hashedPassword,
      role: 'owner',
      status: 'pending',  // Requires password reset on first login
    });
    await queryRunner.manager.save(adminUser);

    await queryRunner.commitTransaction();

    // 3. Send welcome email (after commit to ensure data exists)
    await this.sendMspWelcomeEmail(dto.adminEmail, dto.name, tempPassword);

    return { tenant: savedTenant, adminUserId: adminUser.id };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

### Pattern 2: Unique Slug Generation

**What:** Generate a unique slug from the tenant name, appending numeric suffix if needed.

**When to use:** Creating tenants where slug must be unique.

**Example:**
```typescript
// Source: Existing msp-clients.service.ts pattern (lines 216-229)
private async generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  let slug = baseSlug;
  let counter = 1;
  while (await this.tenantRepository.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}
```

### Pattern 3: Welcome Email for Admin-Created Accounts

**What:** Send welcome email with temporary credentials for admin-created MSP accounts.

**When to use:** After successfully creating an MSP tenant with initial admin user.

**Example:**
```typescript
// Source: EmailService.sendWelcomeEmail pattern extended for MSP
// Need new interface for MSP welcome with temp password
export interface MspWelcomeEmailData {
  to: string;
  adminName: string;
  mspName: string;
  tempPassword: string;
  loginUrl: string;
  planName: string;
}

async sendMspWelcomeEmail(data: MspWelcomeEmailData): Promise<boolean> {
  const subject = `Welcome to Nebula DNS - ${data.mspName} MSP Account Created`;

  // HTML template similar to existing sendWelcomeEmail but with:
  // - Temporary password display
  // - Instruction to change password on first login
  // - MSP-specific getting started steps

  return this.sendEmail(data.to, subject, htmlContent, textContent);
}
```

### Pattern 4: Admin-Only Endpoint with AdminAuthGuard

**What:** Protect MSP creation endpoint with AdminAuthGuard to ensure only internal admins can create MSP accounts.

**When to use:** All admin management endpoints.

**Example:**
```typescript
// Source: Existing AdminController pattern
@Post('msp/tenants')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('admin-jwt')
@ApiOperation({ summary: 'Create new MSP tenant account' })
@ApiResponse({ status: 201, type: MspTenantCreatedResponseDto })
@ApiResponse({ status: 400, description: 'Validation error or slug conflict' })
@ApiResponse({ status: 409, description: 'Email already in use' })
async createMspTenant(
  @Body() dto: CreateMspTenantDto,
  @Req() req: Request,
): Promise<MspTenantCreatedResponseDto> {
  const admin = req.user as AdminUser;
  return this.adminService.createMspTenant(dto, admin.adminId);
}
```

### Anti-Patterns to Avoid
- **Creating tenant and user in separate transactions:** Risk of orphaned tenant or user
- **Storing temporary password in database:** Only store hash, send plain temp password in email
- **Sending email before commit:** Email could be sent for failed creation
- **Admin-provided password:** Security risk, admin knows the password
- **Skipping email validation on adminEmail:** Could create invalid user account

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password generation | Custom random function | `crypto.randomBytes(16).toString('hex')` | Already used in codebase, cryptographically secure |
| Slug generation | Manual regex and loop | Existing pattern in msp-clients.service.ts | Already handles uniqueness |
| Email sending | Direct SMTP | Existing EmailService | Already configured with SendGrid |
| Transaction handling | Manual begin/commit | TypeORM QueryRunner pattern | Already proven in codebase |
| Password hashing | Any other algorithm | bcrypt with cost 12 | Already standard in codebase |

**Key insight:** The msp-clients.service.ts already has a nearly identical pattern for creating client tenants. The MSP onboarding pattern is the same, just with different field values (tier='msp' instead of tier='enterprise').

## Common Pitfalls

### Pitfall 1: Email Already in Use
**What goes wrong:** Admin tries to create MSP with email that already exists for another user
**Why it happens:** User emails are globally unique across all tenants
**How to avoid:** Check email uniqueness before starting transaction, return 409 Conflict
**Warning signs:** Unique constraint violation on users.email

### Pitfall 2: Slug Collision
**What goes wrong:** Two MSPs with same/similar names get conflicting slugs
**Why it happens:** Concurrent creation or forgetting to check uniqueness
**How to avoid:** Use existing generateUniqueSlug pattern with counter
**Warning signs:** Unique constraint violation on tenants.slug

### Pitfall 3: Email Sent for Failed Transaction
**What goes wrong:** Welcome email sent but tenant creation failed
**Why it happens:** Sending email inside transaction before commit
**How to avoid:** Send email after transaction commits successfully
**Warning signs:** User receives email but cannot log in

### Pitfall 4: Temporary Password Too Weak
**What goes wrong:** Generated password doesn't meet validation requirements
**Why it happens:** Random hex string may not satisfy complexity rules
**How to avoid:** Use 32-char hex (16 bytes) which exceeds requirements, or use dedicated password generator
**Warning signs:** Password rejected by validation

### Pitfall 5: Missing Limits Configuration
**What goes wrong:** New MSP has undefined limits (null everywhere)
**Why it happens:** Forgetting to set default locationLimit and clientLimit
**How to avoid:** DTO should have sensible defaults or require explicit values
**Warning signs:** Limits checks return unexpected results

### Pitfall 6: Forgot to Set managedByMspId to null
**What goes wrong:** MSP tenant incorrectly shows as managed by another MSP
**Why it happens:** Copy-paste from client creation pattern that sets managedByMspId
**How to avoid:** Explicitly set managedByMspId: null for MSP tenants (or omit it)
**Warning signs:** MSP appears in another MSP's client list

## Code Examples

Verified patterns from existing codebase:

### CreateMspTenantDto
```typescript
// Source: Pattern from existing CreateMspClientDto and TenantSearchQueryDto
import {
  IsEmail,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMspTenantDto {
  @ApiProperty({
    description: 'MSP organization name',
    example: 'Managed IT Solutions',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated from name if not provided)',
    example: 'managed-it-solutions',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with dashes' })
  slug?: string;

  @ApiProperty({
    description: 'Initial admin user email address',
    example: 'admin@managedit.com',
  })
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({
    description: 'Initial admin user name',
    example: 'John Smith',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  adminName?: string;

  @ApiPropertyOptional({
    description: 'MSP contact email (defaults to adminEmail)',
    example: 'support@managedit.com',
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'MSP contact phone',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Location limit for MSP (null = unlimited)',
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  locationLimit?: number;

  @ApiPropertyOptional({
    description: 'Client organization limit for MSP (null = unlimited)',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  clientLimit?: number;
}
```

### MspTenantCreatedResponseDto
```typescript
// Source: Pattern from existing response DTOs
import { ApiProperty } from '@nestjs/swagger';
import { TenantStatus } from '../../tenants/entities/tenant.entity';

export class MspTenantCreatedResponseDto {
  @ApiProperty({ description: 'Created MSP tenant ID' })
  id: string;

  @ApiProperty({ description: 'MSP name' })
  name: string;

  @ApiProperty({ description: 'MSP unique slug' })
  slug: string;

  @ApiProperty({ description: 'MSP status', example: 'active' })
  status: TenantStatus;

  @ApiProperty({ description: 'MSP tier', example: 'msp' })
  tier: 'msp';

  @ApiProperty({ description: 'Admin user ID' })
  adminUserId: string;

  @ApiProperty({ description: 'Admin user email' })
  adminEmail: string;

  @ApiProperty({ description: 'Whether welcome email was sent' })
  welcomeEmailSent: boolean;

  @ApiProperty({ description: 'Location limit (null = unlimited)' })
  locationLimit: number | null;

  @ApiProperty({ description: 'Client limit (null = unlimited)' })
  clientLimit: number | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;
}
```

### Service Method Implementation
```typescript
// Source: Derived from msp-clients.service.ts create() method
async createMspTenant(
  dto: CreateMspTenantDto,
  createdByAdminId: string,
): Promise<MspTenantCreatedResponseDto> {
  // 1. Check email uniqueness before transaction
  const existingUser = await this.userRepository.findOne({
    where: { email: dto.adminEmail.toLowerCase() },
  });
  if (existingUser) {
    throw new ConflictException(`Email ${dto.adminEmail} is already in use`);
  }

  // 2. Generate unique slug
  const slug = await this.generateUniqueSlug(dto.slug || dto.name);

  // 3. Start transaction
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 4. Create MSP tenant
    const tenant = queryRunner.manager.create(Tenant, {
      name: dto.name,
      slug,
      status: 'active',
      tier: 'msp',
      contactEmail: dto.contactEmail || dto.adminEmail,
      contactPhone: dto.contactPhone,
      locationLimit: dto.locationLimit ?? null,
      clientLimit: dto.clientLimit ?? null,
      subscriptionStatus: 'active',
      managedByMspId: null,  // MSP is not managed by another MSP
      settings: {
        timezone: 'UTC',
        blockPageEnabled: true,
        mspDisplayName: dto.name,
      },
    });
    const savedTenant = await queryRunner.manager.save(tenant);

    // 5. Create initial admin user
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const adminUser = queryRunner.manager.create(User, {
      tenantId: savedTenant.id,
      email: dto.adminEmail.toLowerCase(),
      name: dto.adminName || `${dto.name} Admin`,
      passwordHash: hashedPassword,
      role: 'owner',
      status: 'pending',
    });
    const savedUser = await queryRunner.manager.save(adminUser);

    // 6. Commit transaction
    await queryRunner.commitTransaction();

    // 7. Send welcome email (after commit)
    const loginUrl = this.configService.get<string>('APP_URL', 'https://app.nebuladns.com');
    let welcomeEmailSent = false;
    try {
      welcomeEmailSent = await this.emailService.sendMspWelcomeEmail({
        to: dto.adminEmail,
        adminName: savedUser.name,
        mspName: savedTenant.name,
        tempPassword,
        loginUrl: `${loginUrl}/login`,
        planName: 'MSP',
      });
    } catch (error) {
      this.logger.warn(`Failed to send welcome email: ${error.message}`);
    }

    this.logger.log(
      `Admin ${createdByAdminId} created MSP tenant ${savedTenant.id} (${savedTenant.name})`,
    );

    return {
      id: savedTenant.id,
      name: savedTenant.name,
      slug: savedTenant.slug,
      status: savedTenant.status,
      tier: 'msp',
      adminUserId: savedUser.id,
      adminEmail: savedUser.email,
      welcomeEmailSent,
      locationLimit: savedTenant.locationLimit,
      clientLimit: savedTenant.clientLimit,
      createdAt: savedTenant.createdAt.toISOString(),
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

### Email Template Addition to EmailService
```typescript
// Source: Extend existing EmailService with MSP welcome email
export interface MspWelcomeEmailData {
  to: string;
  adminName: string;
  mspName: string;
  tempPassword: string;
  loginUrl: string;
  planName: string;
}

async sendMspWelcomeEmail(data: MspWelcomeEmailData): Promise<boolean> {
  const subject = `Welcome to Nebula DNS - Your MSP Account is Ready`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Nebula DNS MSP</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Nebula DNS!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your MSP Account is Ready</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px;">Hi ${data.adminName},</p>

    <p style="font-size: 16px;">
      Your Nebula DNS MSP account for <strong>${data.mspName}</strong> has been created.
    </p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e5e7eb;">
      <h3 style="color: #667eea; margin-top: 0;">Your Login Credentials</h3>
      <p><strong>Email:</strong> ${data.to}</p>
      <p><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${data.tempPassword}</code></p>
      <p style="color: #dc2626; font-size: 14px;"><strong>Important:</strong> You will be required to change this password on first login.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Log In to Your Dashboard
      </a>
    </div>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #e5e7eb;">
      <h3 style="color: #667eea; margin-top: 0;">Getting Started as an MSP</h3>
      <ol style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">Log in and change your password</li>
        <li style="margin-bottom: 10px;">Configure your MSP profile and branding</li>
        <li style="margin-bottom: 10px;">Create your first client organization</li>
        <li style="margin-bottom: 10px;">Set up policy templates for easy client deployment</li>
      </ol>
    </div>

    <div style="background: #eff6ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>Need help?</strong> Visit our documentation or contact support.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

    <p style="font-size: 14px; color: #6b7280; text-align: center;">
      This email was sent by Nebula DNS<br>
      Keep this email secure - do not share your temporary password.
    </p>
  </div>
</body>
</html>`;

  const textContent = `
Welcome to Nebula DNS!

Hi ${data.adminName},

Your Nebula DNS MSP account for ${data.mspName} has been created.

Your Login Credentials:
Email: ${data.to}
Temporary Password: ${data.tempPassword}

IMPORTANT: You will be required to change this password on first login.

Log in at: ${data.loginUrl}

Getting Started as an MSP:
1. Log in and change your password
2. Configure your MSP profile and branding
3. Create your first client organization
4. Set up policy templates for easy client deployment

This email was sent by Nebula DNS.
Keep this email secure - do not share your temporary password.
`;

  return this.sendEmail(data.to, subject, htmlContent, textContent);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual DB inserts for MSP setup | Admin API endpoint | This phase | No DBA required for onboarding |
| Shared password sent via Slack | Secure temp password in email | This phase | Better security |
| Multiple manual steps | Single transactional operation | This phase | Atomic, reliable creation |

**Deprecated/outdated:**
- Direct database access for tenant creation: Use admin API
- Partner entity for MSP: Migrated to tier-based system, use tier='msp'

## Open Questions

Things that couldn't be fully resolved:

1. **Force Password Reset on First Login**
   - What we know: User status='pending' indicates need for password change
   - What's unclear: Does the existing auth flow enforce password reset for 'pending' status?
   - Recommendation: Verify auth.service.ts handles this, add if missing (out of scope for this phase but flag for integration testing)

2. **Audit Logging for Admin Actions**
   - What we know: AuditLogsService exists and is tenant-scoped
   - What's unclear: Should MSP creation be logged to a system-level audit or the new MSP's tenant audit?
   - Recommendation: Log to new MSP tenant's audit with admin metadata (similar to impersonation pattern)

3. **Default Limits for New MSPs**
   - What we know: DTO allows optional locationLimit and clientLimit
   - What's unclear: What should the defaults be when not specified?
   - Recommendation: Make limits nullable (unlimited) by default, or require explicit values in DTO

## Sources

### Primary (HIGH confidence)
- Existing codebase: `api/src/modules/msp-clients/msp-clients.service.ts` - Transaction pattern for tenant+user creation (lines 195-331)
- Existing codebase: `api/src/modules/email/email.service.ts` - Email service patterns and interfaces
- Existing codebase: `api/src/modules/admin/admin.controller.ts` - AdminAuthGuard pattern for protected endpoints
- Existing codebase: `api/src/modules/tenants/entities/tenant.entity.ts` - Tenant entity with tier system

### Secondary (MEDIUM confidence)
- Existing codebase: `api/src/modules/users/users.service.ts` - User creation pattern
- Existing codebase: `api/src/modules/admin/dto/msp-listing.dto.ts` - DTO patterns for admin module

### Tertiary (LOW confidence)
- None - all patterns verified in codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components exist in codebase, proven patterns
- Architecture: HIGH - Direct extension of existing msp-clients pattern
- Pitfalls: HIGH - Derived from existing implementation and codebase review

**Research date:** 2026-01-17
**Valid until:** 60 days (stable patterns, codebase-specific)

---

*Phase: 07-msp-onboarding*
*Research completed: 2026-01-17*
