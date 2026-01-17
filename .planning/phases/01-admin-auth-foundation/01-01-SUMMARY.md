---
phase: 01-admin-auth-foundation
plan: 01
subsystem: auth
tags: [jwt, passport, nestjs, typeorm, bcrypt, mfa]

# Dependency graph
requires: []
provides:
  - Admin entity (non-tenant-scoped) with password, MFA, lockout fields
  - AdminMfa entity for TOTP secrets
  - AdminJwtStrategy with named 'admin-jwt' strategy
  - AdminAuthGuard with "Admin authentication required" error
  - Database migrations for admins and admin_mfa tables
  - Initial admin seeded with pending_mfa status
affects: [01-02-PLAN, admin-service, admin-controller, admin-mfa, admin-session]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Named passport strategy pattern for multi-auth
    - Separate JWT secrets per auth system
    - Non-tenant-scoped entity pattern

key-files:
  created:
    - api/src/modules/admin/admin.module.ts
    - api/src/modules/admin/entities/admin.entity.ts
    - api/src/modules/admin/entities/admin-mfa.entity.ts
    - api/src/modules/admin/dto/admin-jwt-payload.dto.ts
    - api/src/modules/admin/strategies/admin-jwt.strategy.ts
    - api/src/modules/admin/guards/admin-auth.guard.ts
    - api/src/database/migrations/1712000000000-CreateAdminsTable.ts
    - api/src/database/migrations/1712000000001-SeedInitialAdmin.ts
  modified:
    - api/src/app.module.ts
    - api/.env.example

key-decisions:
  - "Separate ADMIN_JWT_SECRET from tenant JWT_SECRET for security isolation"
  - "8-hour token expiry for workday sessions"
  - "Admin extends BaseEntity (not TenantScopedEntity) - admins are global"
  - "Issuer claim 'nebula-admin' distinguishes admin tokens from tenant tokens"
  - "Initial admin seeded with 'pending_mfa' status requiring MFA setup"

patterns-established:
  - "Named passport strategy: PassportStrategy(Strategy, 'admin-jwt') for parallel auth systems"
  - "Admin-specific guard returning 'Admin authentication required' error message"
  - "AdminModule with separate JwtModule configuration"

# Metrics
duration: 4min
completed: 2026-01-17
---

# Phase 01 Plan 01: Admin Module Scaffolding Summary

**Admin entity, migrations, JWT strategy 'admin-jwt', and AdminAuthGuard with separate ADMIN_JWT_SECRET**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-17T23:53:06Z
- **Completed:** 2026-01-17T23:56:56Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Admin entity with password hash, MFA status, lockout fields (non-tenant-scoped)
- AdminMfa entity for storing TOTP secrets and backup codes
- Named JWT strategy 'admin-jwt' that validates issuer claim 'nebula-admin'
- AdminAuthGuard returning "Admin authentication required" on failure
- Database migrations creating admins and admin_mfa tables
- Initial admin seeded via migration with pending_mfa status

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Admin entity, MFA entity, and database migrations** - `2f67427` (feat)
2. **Task 2: Create AdminJwtStrategy and AdminAuthGuard** - `0fefaca` (feat)
3. **Task 3: Create AdminModule and register in AppModule** - `6d56428` (feat)

## Files Created/Modified

- `api/src/modules/admin/admin.module.ts` - Admin module with separate JWT config
- `api/src/modules/admin/entities/admin.entity.ts` - Admin entity (non-tenant-scoped)
- `api/src/modules/admin/entities/admin-mfa.entity.ts` - Admin MFA entity
- `api/src/modules/admin/dto/admin-jwt-payload.dto.ts` - JWT payload interface
- `api/src/modules/admin/strategies/admin-jwt.strategy.ts` - Named 'admin-jwt' strategy
- `api/src/modules/admin/guards/admin-auth.guard.ts` - Admin auth guard
- `api/src/database/migrations/1712000000000-CreateAdminsTable.ts` - Create tables
- `api/src/database/migrations/1712000000001-SeedInitialAdmin.ts` - Seed initial admin
- `api/src/app.module.ts` - Registered AdminModule after AuthModule
- `api/.env.example` - Added ADMIN_JWT_SECRET and INITIAL_ADMIN_* variables

## Decisions Made

1. **Separate ADMIN_JWT_SECRET** - Per CONTEXT.md "Claude's discretion" on separate signing key, using distinct secret for admin tokens provides security isolation
2. **8-hour token expiry** - Per CONTEXT.md "workday" session duration for admins
3. **Issuer claim validation** - 'nebula-admin' issuer in tokens prevents tenant tokens from being accepted on admin routes
4. **BaseEntity not TenantScopedEntity** - Admins are global system users, not scoped to any tenant
5. **pending_mfa default status** - First admin must complete MFA setup before full access

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully with passing build and lint.

## User Setup Required

After running migrations, set these environment variables:

```bash
# Generate a unique secret (do NOT reuse JWT_SECRET)
ADMIN_JWT_SECRET=$(openssl rand -base64 64)

# Initial admin credentials (change after first login!)
INITIAL_ADMIN_EMAIL=admin@yourdomain.com
INITIAL_ADMIN_PASSWORD=YourSecurePassword123!
INITIAL_ADMIN_NAME="Admin Name"
```

## Next Phase Readiness

Plan 01-02 can now build on this foundation:
- AdminService for authentication logic (login, logout, password validation)
- AdminSessionService for session management (Redis blacklist integration)
- AdminController for login/logout/MFA endpoints
- Wire isTokenBlacklisted into AdminJwtStrategy (currently stubbed)

**Ready for:** Plan 01-02 (Admin Login/Logout)

---
*Phase: 01-admin-auth-foundation*
*Completed: 2026-01-17*
