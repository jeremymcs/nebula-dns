# Codebase Structure

**Analysis Date:** 2026-01-18

## Directory Layout

```
nebula-dns/
├── api/                    # NestJS Backend API (Control Plane)
│   ├── src/
│   │   ├── main.ts         # Application entry point
│   │   ├── app.module.ts   # Root module with all imports
│   │   ├── common/         # Shared utilities, guards, decorators
│   │   ├── config/         # Configuration loaders
│   │   ├── database/       # Migrations and seeds
│   │   └── modules/        # Feature modules (auth, policies, admin, etc.)
│   ├── test/               # E2E tests
│   └── Dockerfile
├── ui/                     # Next.js Frontend (Dashboard)
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts (AuthContext)
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities, API client, validations
│   ├── e2e/                # Playwright E2E tests
│   └── Dockerfile
├── policy-svc/             # Go Policy Evaluation Service (Data Plane)
│   ├── cmd/main.go         # Entry point
│   └── internal/           # Internal packages
│       ├── cache/          # Redis-backed policy cache
│       ├── clickhouse/     # Query logging client
│       ├── handlers/       # HTTP handlers
│       ├── metrics/        # Prometheus metrics
│       ├── models/         # Data structures
│       └── policy/         # Policy evaluation logic
├── report-svc/             # Go Report Worker Service
│   ├── cmd/main.go         # Entry point
│   └── internal/           # Report generation logic
├── config/                 # Service configurations
│   ├── dnsdist/            # dnsdist.conf for DNS load balancer
│   └── unbound/            # unbound.conf for recursive resolver
├── agents/                 # Endpoint agents (Go)
│   └── safedns-agent/
├── k8s/                    # Kubernetes manifests (Kustomize)
│   ├── base/               # Base configurations
│   └── overlays/           # Environment-specific overlays
├── helm/                   # Helm charts
├── monitoring/             # Prometheus/Grafana configs
├── scripts/                # Utility scripts (migrations, testing)
├── docs/                   # Design documentation
├── tasks/                  # PRD and task definitions
├── docker-compose.yml      # Local development stack
└── .planning/              # GSD planning documents
```

## Directory Purposes

**api/src/modules/:**
- Purpose: Feature-based module organization
- Contains: 45+ NestJS modules, each with controller, service, entities, DTOs
- Key modules:
  - `admin/` - **Internal admin system with separate auth** (see detailed breakdown below)
  - `auth/` - Tenant authentication, JWT, sessions, MFA verification
  - `users/` - User CRUD, role management
  - `tenants/` - Tenant settings, tier management, MSP hierarchy
  - `policies/` - Policy CRUD, versioning, compilation
  - `locations/` - Network locations, IP ranges, tokens
  - `lists/` - Custom allow/block lists with entries
  - `reports/` - ClickHouse analytics, query logs
  - `msp/` - MSP templates, client management
  - `msp-clients/` - MSP client CRUD operations
  - `msp-billing/` - MSP billing, query bundles
  - `subscriptions/` - Stripe integration
  - `trials/` - Trial extensions
  - `subscription-lapse/` - Grace period handling
  - `subscription-plans/` - Tier limits
  - `webhooks/` - Event notifications
  - `siem/` - SIEM integration (Splunk, Elastic)
  - `family/` - Family member management

**api/src/modules/admin/ (Separate Auth System):**
- Purpose: Internal administrator operations isolated from tenant auth
- Structure:
  ```
  admin/
  ├── admin.module.ts           # Module definition
  ├── admin.controller.ts       # All /api/admin/* endpoints
  ├── admin.service.ts          # Auth, search, MSP onboarding, impersonation
  ├── admin.service.spec.ts     # Service tests
  ├── admin.controller.spec.ts  # Controller tests
  ├── admin-session.service.ts  # Redis session management
  ├── admin-health.service.ts   # System health checks
  ├── admin-health.service.spec.ts
  ├── admin-billing.service.ts  # Credits, tier changes, extensions
  ├── admin-billing.service.spec.ts
  ├── strategies/
  │   └── admin-jwt.strategy.ts # Named 'admin-jwt' passport strategy
  ├── guards/
  │   └── admin-auth.guard.ts   # Uses admin-jwt strategy
  ├── entities/
  │   ├── admin.entity.ts       # Admin user (not tenant-scoped)
  │   └── admin-mfa.entity.ts   # Admin MFA config
  └── dto/
      ├── admin-login.dto.ts
      ├── admin-response.dto.ts
      ├── admin-jwt-payload.dto.ts
      ├── tenant-search.dto.ts
      ├── msp-listing.dto.ts
      ├── msp-detail.dto.ts
      ├── msp-onboarding.dto.ts
      ├── impersonation.dto.ts
      ├── system-health.dto.ts
      └── billing.dto.ts
  ```
- **Key:** Uses ADMIN_JWT_SECRET, issuer 'nebula-admin', 8-hour sessions

**api/src/common/:**
- Purpose: Shared code across all modules
- Contains:
  - `decorators/` - Custom decorators (@User, @Tenant, @Roles)
  - `guards/` - Auth guards (JwtAuthGuard, RolesGuard)
  - `filters/` - Exception filters
  - `middleware/` - Security headers, rate limiting
  - `utils/` - Helper functions, encryption
  - `entities/` - Base entity class
  - `dto/` - Shared DTOs
  - `logger/` - Logging configuration
  - `sentry/` - Error tracking
  - `services/` - Shared services

**api/src/database/:**
- Purpose: Database migrations and seed data
- Contains:
  - `migrations/` - TypeORM migrations (1709000000000-*.ts pattern)
  - `seeds/` - Development seed data

**ui/src/app/:**
- Purpose: Next.js App Router pages
- Contains:
  - `dashboard/` - Main dashboard pages (policies, locations, reports, etc.)
  - `dashboard/clients/` - MSP client management
  - `dashboard/msp/` - MSP-specific features
  - `dashboard/settings/` - Settings pages including family, white-label
  - `dashboard/billing/` - Billing page
  - `(public)/` - Public pages (landing, signup, pricing)
  - `invite/` - Invitation acceptance flows
  - `mission-control/` - Admin control center
- Structure: `page.tsx` for pages, `layout.tsx` for layouts
- **Partner pages removed:** No more `/partner/*` routes

**ui/src/components/:**
- Purpose: Reusable React components
- Contains:
  - `layout/` - DashboardLayout, Sidebar, TopNav, MissionControlSidebar
  - `dashboard/` - Dashboard-specific components, UsageWidget
  - `ui/` - Generic UI components
  - `auth/` - Login, signup forms
  - `msp/` - MSP-specific components
  - `family/` - Family member components
  - `billing/` - Billing and subscription components
  - `banners/` - Notification banners
  - `trials/` - Trial components
  - `home/` - Home page components
- **PartnerLayout removed:** Partner system deprecated

**ui/src/hooks/:**
- Purpose: Custom React hooks
- Key hooks:
  - `useApi.ts` - API request wrapper (large file, 24k+ lines)
  - `useTierFeatures.tsx` - Tier-based feature access
  - `useSubscriptionStatus.ts` - Subscription state
  - `useMspClients.ts` - MSP client management
  - `useClientContext.ts` - MSP client context switching
  - `useFamily.ts` - Family member operations
  - `useTrial.ts` - Trial state
  - `useUsageStats.ts` - Usage statistics

**ui/src/contexts/:**
- Purpose: React Context providers
- Key contexts:
  - `AuthContext.tsx` - Authentication, tier info, MSP info
- **PartnerBrandingContext removed:** Partner system deprecated

**policy-svc/internal/:**
- Purpose: Go internal packages (not exported)
- Contains:
  - `cache/cache.go` - PolicyCache with Redis + in-memory, subscription status checks
  - `handlers/handlers.go` - HTTP endpoint handlers including subscription check
  - `models/models.go` - Request/response structures
  - `policy/service.go` - Evaluation algorithm
  - `clickhouse/` - Query logging
  - `metrics/` - Prometheus metrics

## Key File Locations

**Entry Points:**
- `api/src/main.ts`: NestJS bootstrap, Swagger setup
- `api/src/modules/admin/admin.controller.ts`: Admin API entry (separate auth)
- `policy-svc/cmd/main.go`: Go policy service entry
- `report-svc/cmd/main.go`: Go report worker entry
- `ui/src/app/layout.tsx`: Next.js root layout
- `config/dnsdist/dnsdist.conf`: DNS load balancer config

**Configuration:**
- `api/src/config/configuration.ts`: Environment config loader
- `api/src/config/encryption.config.ts`: Encryption key validation
- `ui/next.config.js`: Next.js configuration
- `docker-compose.yml`: Local development services

**Core Business Logic:**
- `api/src/modules/policies/policy-compiler.service.ts`: Compiles policies for cache
- `api/src/modules/auth/auth.service.ts`: Tenant authentication, JWT, sessions
- `api/src/modules/admin/admin.service.ts`: Admin auth, MSP onboarding, impersonation
- `api/src/modules/admin/admin-billing.service.ts`: Admin billing operations
- `policy-svc/internal/cache/cache.go`: Policy cache with pub/sub
- `policy-svc/internal/handlers/handlers.go`: DNS policy evaluation endpoint

**Tenant/MSP Hierarchy:**
- `api/src/modules/tenants/entities/tenant.entity.ts`: Tenant with self-referential `managedByMspId`
- `api/src/modules/msp-clients/msp-clients.service.ts`: MSP client CRUD
- `api/src/modules/auth/auth.service.ts`: `getManagedOrganizations()`, `switchTenant()`

**Database Schema:**
- `api/src/modules/*/entities/*.entity.ts`: TypeORM entity definitions
- `api/src/database/migrations/`: Database migration files
- `scripts/init-postgres.sql`: Initial schema setup

**Testing:**
- `api/src/modules/*/*.spec.ts`: Unit tests (Jest)
- `api/test/*.e2e-spec.ts`: E2E tests
- `ui/e2e/*.spec.ts`: Playwright E2E tests

## Naming Conventions

**Files:**
- API entities: `kebab-case.entity.ts` (e.g., `policy-version.entity.ts`)
- API services: `kebab-case.service.ts` (e.g., `auth.service.ts`, `admin-billing.service.ts`)
- API controllers: `kebab-case.controller.ts`
- API modules: `kebab-case.module.ts`
- API DTOs: `kebab-case.dto.ts`
- API tests: `kebab-case.spec.ts` (unit), `kebab-case.e2e-spec.ts` (e2e)
- UI pages: `page.tsx` (in route folder)
- UI components: `PascalCase.tsx` (e.g., `DashboardLayout.tsx`)
- Go files: `snake_case.go` or `single_word.go`

**Directories:**
- API modules: `kebab-case/` (e.g., `block-pages/`, `msp-clients/`)
- UI routes: `kebab-case/` or `[param]/` for dynamic
- Go packages: `single_word/` (e.g., `handlers/`, `cache/`)

## Where to Add New Code

**New API Feature:**
- Create module: `api/src/modules/{feature}/`
- Add files: `{feature}.module.ts`, `{feature}.service.ts`, `{feature}.controller.ts`
- Add entity: `entities/{feature}.entity.ts`
- Add DTOs: `dto/{feature}.dto.ts`
- Register in `api/src/app.module.ts`
- Tests: `{feature}.service.spec.ts`, `{feature}.controller.spec.ts`

**New Admin Endpoint:**
- Add method to `api/src/modules/admin/admin.controller.ts`
- Add business logic to appropriate service:
  - `admin.service.ts` for auth, search, MSP operations
  - `admin-billing.service.ts` for billing operations
  - `admin-health.service.ts` for health/monitoring
- Add DTO to `api/src/modules/admin/dto/`
- Use `@UseGuards(AdminAuthGuard)` for protection

**New API Endpoint on Existing Module:**
- Add method to controller in `api/src/modules/{module}/{module}.controller.ts`
- Add business logic to service in `api/src/modules/{module}/{module}.service.ts`
- Add DTO if needed in `dto/`

**New UI Page:**
- Create folder: `ui/src/app/dashboard/{feature}/`
- Add `page.tsx` for the route
- Add components to `ui/src/components/{feature}/`

**New UI Component:**
- Shared component: `ui/src/components/ui/{ComponentName}.tsx`
- Feature component: `ui/src/components/{feature}/{ComponentName}.tsx`

**New UI Hook:**
- Add to `ui/src/hooks/{useHookName}.ts`
- Export from `ui/src/hooks/index.ts`

**New API Endpoint in api.ts:**
- Add method to `ui/src/lib/api.ts`

**Utilities:**
- API: `api/src/common/utils/`
- UI: `ui/src/lib/`

**Database Migration:**
- Run: `npm run migration:generate -- src/database/migrations/Name`
- Creates: `api/src/database/migrations/{timestamp}-{Name}.ts`

## Special Directories

**node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (npm install)
- Committed: No

**dist/:**
- Purpose: Compiled TypeScript output (API)
- Generated: Yes (npm run build)
- Committed: No

**.next/:**
- Purpose: Next.js build cache
- Generated: Yes (npm run build)
- Committed: No

**test-results/:**
- Purpose: Playwright test artifacts
- Generated: Yes (npm run test:e2e)
- Committed: No

**.planning/:**
- Purpose: GSD planning documents
- Generated: By GSD commands
- Committed: Yes

**monitoring/:**
- Purpose: Prometheus/Grafana configurations
- Generated: No
- Committed: Yes

## Removed/Deprecated

**Partner System (Removed):**
- `api/src/modules/partners/` - Deleted
- `ui/src/app/partner/` - Deleted
- `ui/src/components/layout/PartnerLayout.tsx` - Deleted
- `ui/src/contexts/PartnerBrandingContext.tsx` - Deleted
- **Replaced by:** MSP tier system with self-referential tenant hierarchy
- **Migration guide:** `docs/msp-migration-guide.md`

---

*Structure analysis: 2026-01-18*
