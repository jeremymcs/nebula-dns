# Codebase Structure

**Analysis Date:** 2026-01-17

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
│   │   └── modules/        # Feature modules (auth, policies, etc.)
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
  - `auth/` - Authentication, JWT, sessions, MFA verification
  - `users/` - User CRUD, role management
  - `tenants/` - Tenant settings, tier management
  - `policies/` - Policy CRUD, versioning, compilation
  - `locations/` - Network locations, IP ranges, tokens
  - `lists/` - Custom allow/block lists with entries
  - `reports/` - ClickHouse analytics, query logs
  - `msp/` - MSP client management, templates
  - `msp-billing/` - MSP billing, query bundles
  - `subscriptions/` - Stripe integration
  - `webhooks/` - Event notifications
  - `siem/` - SIEM integration (Splunk, Elastic)

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

**api/src/database/:**
- Purpose: Database migrations and seed data
- Contains:
  - `migrations/` - TypeORM migrations (1709000000000-*.ts pattern)
  - `seeds/` - Development seed data

**ui/src/app/:**
- Purpose: Next.js App Router pages
- Contains:
  - `dashboard/` - Main dashboard pages (policies, locations, reports, etc.)
  - `(public)/` - Public pages (landing, signup, pricing)
  - `invite/` - Invitation acceptance flows
  - `mission-control/` - Admin control center
- Structure: `page.tsx` for pages, `layout.tsx` for layouts

**ui/src/components/:**
- Purpose: Reusable React components
- Contains:
  - `layout/` - DashboardLayout, Sidebar, TopNav
  - `dashboard/` - Dashboard-specific components
  - `ui/` - Generic UI components
  - `auth/` - Login, signup forms
  - `msp/` - MSP-specific components
  - `family/` - Family mode components
  - `billing/` - Billing and subscription components

**ui/src/hooks/:**
- Purpose: Custom React hooks
- Key hooks:
  - `useApi.ts` - API request wrapper
  - `useTierFeatures.tsx` - Tier-based feature access
  - `useSubscriptionStatus.ts` - Subscription state
  - `useMspClients.ts` - MSP client management

**policy-svc/internal/:**
- Purpose: Go internal packages (not exported)
- Contains:
  - `cache/cache.go` - PolicyCache with Redis + in-memory
  - `handlers/handlers.go` - HTTP endpoint handlers
  - `models/models.go` - Request/response structures
  - `policy/` - Evaluation algorithm
  - `clickhouse/` - Query logging
  - `metrics/` - Prometheus metrics

## Key File Locations

**Entry Points:**
- `api/src/main.ts`: NestJS bootstrap, Swagger setup
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
- `api/src/modules/auth/auth.service.ts`: Authentication, JWT, sessions
- `policy-svc/internal/cache/cache.go`: Policy cache with pub/sub
- `policy-svc/internal/handlers/handlers.go`: DNS policy evaluation endpoint

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
- API services: `kebab-case.service.ts` (e.g., `auth.service.ts`)
- API controllers: `kebab-case.controller.ts`
- API modules: `kebab-case.module.ts`
- API DTOs: `kebab-case.dto.ts`
- API tests: `kebab-case.spec.ts` (unit), `kebab-case.e2e-spec.ts` (e2e)
- UI pages: `page.tsx` (in route folder)
- UI components: `PascalCase.tsx` (e.g., `DashboardLayout.tsx`)
- Go files: `snake_case.go` or `single_word.go`

**Directories:**
- API modules: `kebab-case/` (e.g., `block-pages/`)
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

**New API Hook:**
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

---

*Structure analysis: 2026-01-17*
