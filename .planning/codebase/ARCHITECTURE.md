# Architecture

**Analysis Date:** 2026-01-18

## Pattern Overview

**Overall:** Three-tier Control/Data Plane Separation with Event-Driven Cache Invalidation and Dual Authentication Systems

**Key Characteristics:**
- Control Plane (NestJS API + Next.js UI) for policy management and user operations
- Data Plane (dnsdist + Policy Service + Unbound) for DNS resolution with O(1) policy evaluation
- **Separate Admin Authentication System** with isolated JWT secrets and issuer
- Multi-tenant architecture with tenant_id scoping all data and operations
- **Self-referential MSP-Client tenant hierarchy** (Partner system deprecated and removed)
- Tier-based feature gating (home, enterprise, msp)
- Fail-open strategy for DNS queries when Policy Service unavailable
- Redis pub/sub for instant cache invalidation across services

## Layers

**Presentation Layer (UI):**
- Purpose: User interface for dashboard, policy management, and analytics
- Location: `ui/src/`
- Contains: React components, pages, hooks, contexts
- Depends on: API via REST calls (`ui/src/lib/api.ts`)
- Used by: End users, administrators, MSP operators

**API Layer (Control Plane):**
- Purpose: RESTful API for all business operations, authentication, policy CRUD
- Location: `api/src/`
- Contains: NestJS modules, controllers, services, entities
- Depends on: PostgreSQL (TypeORM), Redis, ClickHouse, external integrations
- Used by: UI, external integrations via API keys, webhooks

**Admin Layer (Separate Auth System):**
- Purpose: Internal administrator operations with isolated authentication
- Location: `api/src/modules/admin/`
- Contains:
  - `admin.controller.ts` - All admin endpoints (/api/admin/*)
  - `admin.service.ts` - Auth, tenant search, MSP onboarding, impersonation
  - `admin-session.service.ts` - Redis session management for admins
  - `admin-health.service.ts` - System health monitoring
  - `admin-billing.service.ts` - Billing operations (credits, tier changes, extensions)
  - `strategies/admin-jwt.strategy.ts` - Passport strategy with 'nebula-admin' issuer
  - `guards/admin-auth.guard.ts` - Protects admin routes
  - `entities/admin.entity.ts` - Admin user (not tenant-scoped)
  - `entities/admin-mfa.entity.ts` - Admin MFA configuration
- **Critical Separation:** Uses ADMIN_JWT_SECRET (not JWT_SECRET), 8-hour sessions, issuer 'nebula-admin'
- Entry Point: Controller routes at `/api/admin/*`

**Policy Evaluation Layer (Data Plane):**
- Purpose: Real-time DNS policy decisions at O(1) complexity
- Location: `policy-svc/`
- Contains: Go HTTP handlers, cache management, policy evaluation logic
- Depends on: Redis (policy cache), ClickHouse (query logging)
- Used by: dnsdist for every DNS query

**DNS Resolution Layer:**
- Purpose: DNS load balancing, protocol termination (DoH/DoT), query routing
- Location: `config/dnsdist/dnsdist.conf`
- Contains: Lua configuration for dnsdist
- Depends on: Policy Service for decisions, Unbound for resolution
- Used by: Client DNS queries

**Storage Layer:**
- Purpose: Persistent data, caching, analytics
- Locations:
  - PostgreSQL: Primary relational data (`api/src/modules/*/entities/`)
  - Redis: Policy cache, sessions, rate limits (`api/src/modules/redis/`)
  - ClickHouse: DNS query logs, analytics (`api/src/modules/clickhouse/`)
- Used by: API, Policy Service, Report Service

## Authentication Systems

**Tenant Authentication:**
- JWT_SECRET for signing
- Issuer: `nebula-dns`
- 15-minute access tokens, 7-day refresh tokens
- Payload includes: userId, tenantId, role, tier, mfaVerified
- Strategy: `jwt` (default in `api/src/modules/auth/strategies/jwt.strategy.ts`)
- Guard: `JwtAuthGuard`
- Location: `api/src/modules/auth/`

**Admin Authentication (Separate System):**
- ADMIN_JWT_SECRET for signing (different secret!)
- Issuer: `nebula-admin`
- 8-hour access tokens (workday sessions)
- Payload includes: adminId, email, name, mfaVerified, jti
- Strategy: `admin-jwt` (named strategy in `api/src/modules/admin/strategies/admin-jwt.strategy.ts`)
- Guard: `AdminAuthGuard`
- Location: `api/src/modules/admin/`
- **Issuer Validation:** AdminJwtStrategy explicitly validates `iss === 'nebula-admin'` to reject tenant tokens

## Data Flow

**DNS Query Resolution:**

1. Client sends DNS query to dnsdist (port 53/853/443)
2. dnsdist extracts tenant context via token or IP lookup (`/auth/validate`, `/auth/lookup-ip`)
3. dnsdist calls Policy Service `/evaluate` with tenant_id, location_id, qname
4. **US-029:** Policy Service checks `IsTenantSuspended()` - suspended tenants get NXDOMAIN
5. Policy Service checks in-memory cache, falls back to Redis for compiled policy
6. Policy Service returns decision (ALLOW/BLOCK/REWRITE) with metadata
7. dnsdist applies decision (forward to Unbound, NXDOMAIN, CNAME rewrite)
8. Response logged to ClickHouse via Policy Service `/log` endpoint

**Policy Change Propagation:**

1. User modifies policy via UI/API
2. API service compiles policy (`api/src/modules/policies/policy-compiler.service.ts`)
3. Compiled policy stored in Redis with key `policy:{locationId}`
4. API publishes invalidation message to Redis `nebula:invalidate` channel
5. Policy Service receives message, clears in-memory cache
6. Next DNS query fetches fresh policy from Redis

**Admin Impersonation Flow:**

1. Admin authenticates at `/api/admin/login` -> receives admin JWT (8h, ADMIN_JWT_SECRET)
2. Admin calls `POST /api/admin/impersonate/:tenantId` with AdminAuthGuard
3. Service generates tenant-scoped JWT (1h, JWT_SECRET, issuer 'nebula-dns')
4. Token includes `impersonatingAdminId` and `impersonatingAdminEmail` claims
5. Admin uses tenant JWT to access tenant dashboard as 'admin' role
6. `POST /api/admin/impersonate/end` verifies impersonation token and blacklists it
7. All impersonation events are audit-logged (`admin_impersonation_start`, `admin_impersonation_end`)

**MSP Tenant Hierarchy (Self-Referential):**

1. MSP tenant has `tier: 'msp'` and `managedByMspId: null`
2. Client tenants have `managedByMspId: <msp_tenant_id>` (self-referential FK on Tenant)
3. MSP users query `/auth/organizations` to get managed clients list
4. MSP users call `/auth/switch-tenant` with target tenantId
5. New JWT issued with target tenantId, page reloads with new context
6. Admin can view MSP hierarchy at `/api/admin/msp/tenants` and `/api/admin/msp/tenants/:mspId/clients`

**State Management:**
- UI: React Context (AuthContext) with localStorage for tokens
- AuthContext includes: tier, isHome, isEnterprise, isMspTier, isMsp, organizations
- API: Stateless JWT-based authentication with Redis session tracking
- Policy Service: In-memory caches with Redis pub/sub invalidation

## Key Abstractions

**CompiledPolicy:**
- Purpose: Pre-computed policy for O(1) evaluation
- Examples: `api/src/modules/policies/policy-compiler.service.ts`, `policy-svc/internal/cache/cache.go`
- Pattern: HashMaps for exact domain matching, Suffix Tries for wildcard matching
- Contains: allowlist/blocklist (exact + wildcard), blocked categories, threat feeds, SafeSearch rules, schedules

**Tenant (with MSP Hierarchy):**
- Purpose: Multi-tenant isolation boundary with tier-based features
- Location: `api/src/modules/tenants/entities/tenant.entity.ts`
- Pattern: Self-referential FK via `managedByMspId` column
- Fields: tier (home/enterprise/msp), status, subscriptionStatus, locationLimit, clientLimit
- Relationships: `managedByMsp` (parent MSP), `managedClients` (child clients for MSPs)
- **Partner system deprecated:** Use tier='msp' instead of separate Partner entity

**Admin Entity:**
- Purpose: Internal administrator accounts (completely separate from tenant Users)
- Location: `api/src/modules/admin/entities/admin.entity.ts`
- Pattern: Not tenant-scoped, has own password, MFA, lockout, sessions
- Fields: email, passwordHash, status, mfaSetupComplete, failedLoginAttempts, lockedUntil

**Location:**
- Purpose: Network endpoint with associated policy
- Examples: `api/src/modules/locations/entities/location.entity.ts`
- Pattern: IP ranges and tokens map to locations; locations link to policies

**Module Pattern (NestJS):**
- Purpose: Feature encapsulation with dependency injection
- Examples: `api/src/modules/auth/auth.module.ts`, `api/src/modules/admin/admin.module.ts`
- Pattern: Each module contains controller, service, entities, DTOs

## Entry Points

**API Server:**
- Location: `api/src/main.ts`
- Triggers: HTTP requests on port 4010
- Responsibilities: Bootstrap NestJS app, configure Swagger, CORS, validation pipes, global filters

**Admin Routes:**
- Location: `api/src/modules/admin/admin.controller.ts`
- Path Prefix: `/api/admin/*`
- Protected by: `AdminAuthGuard` (uses admin-jwt strategy)
- Key Endpoints:
  - `POST /admin/login` - Admin authentication
  - `GET /admin/me` - Admin profile
  - `GET /admin/tenants/search` - Search tenants
  - `GET /admin/msp/tenants` - List MSP tenants
  - `GET /admin/msp/tenants/:id` - MSP detail with client counts
  - `GET /admin/msp/tenants/:id/clients` - MSP client list
  - `POST /admin/msp/tenants` - Create new MSP tenant
  - `POST /admin/impersonate/:tenantId` - Start impersonation
  - `POST /admin/impersonate/end` - End impersonation
  - `GET /admin/system/health` - System health status
  - `GET /admin/tenants/:id/billing/*` - Billing operations

**Policy Service:**
- Location: `policy-svc/cmd/main.go`
- Triggers: HTTP requests on port 8080
- Responsibilities: Initialize Redis/ClickHouse clients, start cache subscriber, handle /evaluate /log /health

**UI Application:**
- Location: `ui/src/app/layout.tsx`
- Triggers: Browser requests
- Responsibilities: Root layout, providers, authentication context

**dnsdist:**
- Location: `config/dnsdist/dnsdist.conf`
- Triggers: DNS queries on ports 53 (UDP/TCP), 853 (DoT), 443 (DoH)
- Responsibilities: Tenant extraction, policy evaluation calls, response handling

## Error Handling

**Strategy:** Fail-open for DNS resolution, fail-closed for authentication

**Patterns:**
- DNS queries: Return ALLOW if Policy Service unavailable (configurable via FAIL_MODE)
- **Suspended tenants (US-029):** Return NXDOMAIN for all queries
- API: GlobalExceptionFilter provides standardized error responses
- Validation: class-validator with whitelist mode strips unknown fields
- Rate limiting: Per-tenant limits enforced at middleware level
- Admin lockout: 5 failed attempts -> 30-minute lockout
- Tenant lockout: 5 failed attempts -> 15-minute lockout

**API Error Format:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [...]
}
```

## Cross-Cutting Concerns

**Logging:**
- API: NestJS Logger with Sentry integration (`api/src/common/logger/`, `api/src/common/sentry/`)
- Policy Service: zap structured logging
- DNS queries: ClickHouse for analytics, structured logs for debugging

**Validation:**
- API: class-validator decorators on DTOs, ValidationPipe with transform enabled
- Policy Service: Manual field validation in handlers

**Authentication:**
- **Tenant:** JWT tokens with 15-minute expiry, refresh tokens with 7-day expiry (JWT_SECRET)
- **Admin:** JWT tokens with 8-hour expiry (ADMIN_JWT_SECRET, issuer 'nebula-admin')
- Session tracking in Redis with JTI-based blacklisting (separate for admin vs tenant)
- MFA support via TOTP with backup codes
- SSO via SAML and OIDC

**Multi-Tenancy:**
- All database queries include tenant_id filter
- JWT tokens contain tenantId claim
- Redis keys prefixed with tenant context
- Guards validate tenant access on every request
- MSP hierarchy via self-referential `managedByMspId` FK

**Audit Logging:**
- Immutable audit trail in PostgreSQL (`api/src/modules/audit-logs/`)
- Captures action, resource type, resource ID, user, metadata, timestamp
- No UPDATE/DELETE on audit records
- Admin impersonation events specially tracked

---

*Architecture analysis: 2026-01-18*
