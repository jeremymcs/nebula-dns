# Architecture

**Analysis Date:** 2026-01-17

## Pattern Overview

**Overall:** Three-tier Control/Data Plane Separation with Event-Driven Cache Invalidation

**Key Characteristics:**
- Control Plane (NestJS API + Next.js UI) for policy management and user operations
- Data Plane (dnsdist + Policy Service + Unbound) for DNS resolution with O(1) policy evaluation
- Multi-tenant architecture with tenant_id scoping all data and operations
- Fail-open strategy for DNS queries when Policy Service unavailable
- Redis pub/sub for instant cache invalidation across services
- Tier-based feature gating (home, enterprise, msp)

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

## Data Flow

**DNS Query Resolution:**

1. Client sends DNS query to dnsdist (port 53/853/443)
2. dnsdist extracts tenant context via token or IP lookup (`/auth/validate`, `/auth/lookup-ip`)
3. dnsdist calls Policy Service `/evaluate` with tenant_id, location_id, qname
4. Policy Service checks in-memory cache, falls back to Redis for compiled policy
5. Policy Service returns decision (ALLOW/BLOCK/REWRITE) with metadata
6. dnsdist applies decision (forward to Unbound, NXDOMAIN, CNAME rewrite)
7. Response logged to ClickHouse via Policy Service `/log` endpoint

**Policy Change Propagation:**

1. User modifies policy via UI/API
2. API service compiles policy (`api/src/modules/policies/policy-compiler.service.ts`)
3. Compiled policy stored in Redis with key `policy:{locationId}`
4. API publishes invalidation message to Redis `nebula:invalidate` channel
5. Policy Service receives message, clears in-memory cache
6. Next DNS query fetches fresh policy from Redis

**State Management:**
- UI: React Context for auth state (`ui/src/contexts/AuthContext.tsx`)
- API: Stateless JWT-based authentication with Redis session tracking
- Policy Service: In-memory caches with Redis pub/sub invalidation

## Key Abstractions

**CompiledPolicy:**
- Purpose: Pre-computed policy for O(1) evaluation
- Examples: `api/src/modules/policies/policy-compiler.service.ts`, `policy-svc/internal/cache/cache.go`
- Pattern: HashMaps for exact domain matching, Suffix Tries for wildcard matching
- Contains: allowlist/blocklist (exact + wildcard), blocked categories, threat feeds, SafeSearch rules, schedules

**Tenant:**
- Purpose: Multi-tenant isolation boundary
- Examples: `api/src/modules/tenants/entities/tenant.entity.ts`
- Pattern: Every entity references tenant_id; JWT tokens scoped to tenant
- Tiers: `home`, `enterprise`, `msp` with feature gating

**Location:**
- Purpose: Network endpoint with associated policy
- Examples: `api/src/modules/locations/entities/location.entity.ts`
- Pattern: IP ranges and tokens map to locations; locations link to policies

**Module Pattern (NestJS):**
- Purpose: Feature encapsulation with dependency injection
- Examples: `api/src/modules/auth/auth.module.ts`, `api/src/modules/policies/policies.module.ts`
- Pattern: Each module contains controller, service, entities, DTOs

## Entry Points

**API Server:**
- Location: `api/src/main.ts`
- Triggers: HTTP requests on port 4010
- Responsibilities: Bootstrap NestJS app, configure Swagger, CORS, validation pipes, global filters

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

**Report Service:**
- Location: `report-svc/cmd/main.go`
- Triggers: Scheduled jobs for report generation
- Responsibilities: ClickHouse queries, report aggregation, email delivery

## Error Handling

**Strategy:** Fail-open for DNS resolution, fail-closed for authentication

**Patterns:**
- DNS queries: Return ALLOW if Policy Service unavailable (configurable via FAIL_MODE)
- API: GlobalExceptionFilter provides standardized error responses
- Validation: class-validator with whitelist mode strips unknown fields
- Rate limiting: Per-tenant limits enforced at middleware level

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
- JWT tokens with 15-minute expiry, refresh tokens with 7-day expiry
- Session tracking in Redis with JTI-based blacklisting
- MFA support via TOTP with backup codes
- SSO via SAML and OIDC

**Multi-Tenancy:**
- All database queries include tenant_id filter
- JWT tokens contain tenantId claim
- Redis keys prefixed with tenant context
- Guards validate tenant access on every request

**Audit Logging:**
- Immutable audit trail in PostgreSQL (`api/src/modules/audit-logs/`)
- Captures action, resource type, resource ID, user, metadata, timestamp
- No UPDATE/DELETE on audit records

---

*Architecture analysis: 2026-01-17*
