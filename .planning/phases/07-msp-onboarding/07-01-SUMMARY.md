# Phase 7 Plan 1: MSP Onboarding DTOs and Service Summary

## One-liner

Transactional MSP tenant creation with atomic tenant + admin user creation, slug uniqueness, and 12 unit tests.

## What Was Built

### 1. MSP Onboarding DTOs (`api/src/modules/admin/dto/msp-onboarding.dto.ts`)

**CreateMspTenantDto** - Request body for MSP creation:
- `name` (required): MSP organization name with 2-255 char validation
- `slug` (optional): URL-friendly slug with pattern `/^[a-z0-9-]+$/`, auto-generated if not provided
- `adminEmail` (required): Initial admin user email with IsEmail validation
- `adminName` (optional): Admin display name, defaults to "{name} Admin"
- `contactEmail` (optional): MSP contact, defaults to adminEmail
- `contactPhone` (optional): Phone number
- `locationLimit` (optional): Max locations (null = unlimited)
- `clientLimit` (optional): Max managed clients (null = unlimited)

**MspTenantCreatedResponseDto** - Response after creation:
- Tenant details: id, name, slug, status, tier
- Admin user details: adminUserId, adminEmail
- Limits: locationLimit, clientLimit
- Metadata: welcomeEmailSent, createdAt
- `tempPassword` (internal): For Plan 02 welcome email

### 2. createMspTenant Service Method (`api/src/modules/admin/admin.service.ts`)

**Added dependencies:**
- `ConflictException` from @nestjs/common
- `DataSource` from typeorm for transactions
- `crypto` for random password generation

**generateUniqueSlug private method:**
- Converts name to lowercase slug (e.g., "Acme MSP" -> "acme-msp")
- Strips non-alphanumeric characters, replaces with hyphens
- Appends counter suffix if slug exists (acme-msp-1, acme-msp-2, etc.)

**createMspTenant method flow:**
1. Check email uniqueness (before transaction)
2. Generate unique slug or verify provided slug
3. Start transaction with queryRunner
4. Create Tenant entity with tier='msp', status='active'
5. Create User entity with role='owner', status='pending'
6. Hash temp password with bcrypt cost 12
7. Commit transaction
8. Return response with tempPassword for email service

**Error handling:**
- `ConflictException` for duplicate email
- `ConflictException` for duplicate slug
- Transaction rollback on any error
- Query runner release in finally block

### 3. Unit Tests (`api/src/modules/admin/admin.service.spec.ts`)

12 test cases covering:
- Valid MSP tenant creation
- Duplicate email throws ConflictException
- Unique slug generation with counter suffix
- Provided slug usage when unique
- Duplicate slug throws ConflictException
- Transaction rollback on error
- Default values for optional fields
- Custom values for optional fields
- Email normalization to lowercase
- Password hashing with bcrypt cost 12
- Query runner release in finally block

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Email uniqueness check before transaction | Fail fast without starting transaction for known conflicts |
| Temp password via crypto.randomBytes(16) | 32-character hex string for secure initial password |
| User status 'pending' | Requires password change on first login |
| Plan 'enterprise' for MSPs | MSPs get full feature access |
| Transaction with queryRunner | Atomic tenant + user creation with proper rollback |
| bcrypt cost 12 | Matches existing tenant user password hashing |

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `api/src/modules/admin/dto/msp-onboarding.dto.ts` | Created | DTOs for MSP creation request/response |
| `api/src/modules/admin/admin.service.ts` | Modified | Added createMspTenant method and dependencies |
| `api/src/modules/admin/admin.service.spec.ts` | Created | 12 unit tests for createMspTenant |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 7f77db2 | feat | Add MSP onboarding DTOs |
| 30ee40f | feat | Add createMspTenant service method |
| bb72983 | test | Add unit tests for createMspTenant |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Blockers:** None

**Ready for Plan 02:**
- DTOs exported and ready for controller endpoint
- Service method returns tempPassword for welcome email
- Plan 02 will add POST /admin/msp/tenants endpoint
- Plan 02 will integrate EmailService for welcome emails

## Metrics

- **Duration:** ~5 minutes
- **Tests:** 12 passing
- **Files:** 3 (1 created DTO, 1 modified service, 1 created test)
