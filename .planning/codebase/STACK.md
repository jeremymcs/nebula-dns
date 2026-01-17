# Technology Stack

**Analysis Date:** 2026-01-17

## Languages

**Primary:**
- TypeScript 5.3.3 - API (NestJS), UI (Next.js)
- Go 1.23.0 - Policy Service, Report Service

**Secondary:**
- Lua - dnsdist configuration (`config/dnsdist/dnsdist.conf`)
- SQL - PostgreSQL migrations, ClickHouse init scripts

## Runtime

**Environment:**
- Node.js 20 (Alpine-based Docker images)
- Go 1.23.0

**Package Manager:**
- npm (API and UI)
- Go modules (policy-svc, report-svc)
- Lockfile: `package-lock.json` present for UI

## Frameworks

**Core:**
- NestJS 10.3.0 - API backend framework
- Next.js 16.1.1 - UI frontend framework (App Router)
- Chi 5.0.11 - Go HTTP router (policy-svc, report-svc)

**Testing:**
- Jest 29.7.0 - API unit tests (`api/src/**/*.spec.ts`)
- Playwright 1.57.0 - UI E2E tests (`ui/e2e/*.spec.ts`)
- Go testing - Policy service tests (`policy-svc/**/*_test.go`)
- Supertest 6.3.4 - API HTTP testing
- Testcontainers 11.11.0 - Integration tests with real databases

**Build/Dev:**
- NestJS CLI 10.3.0 - API scaffolding and build
- TypeORM 0.3.19 - Database ORM and migrations
- Tailwind CSS 3.4.1 - UI styling
- PostCSS 8.4.33 - CSS processing

## Key Dependencies

**Critical (API):**
- `@nestjs/jwt` 10.2.0 - JWT authentication
- `@nestjs/passport` 10.0.3 - Authentication strategies
- `typeorm` 0.3.19 - PostgreSQL ORM
- `ioredis` 5.3.2 - Redis client
- `@clickhouse/client` 0.2.6 - ClickHouse analytics
- `stripe` 20.0.0 - Payment processing
- `@sendgrid/mail` 8.1.6 - Transactional email
- `@sentry/node` 10.29.0 - Error tracking

**Critical (UI):**
- `react` 18.2.0 - UI framework
- `react-hook-form` 7.71.1 - Form handling
- `swr` 2.2.4 - Data fetching/caching
- `zod` 4.3.5 - Schema validation
- `recharts` 3.6.0 - Data visualization
- `@headlessui/react` 1.7.18 - Accessible UI components

**Critical (Policy Service):**
- `go-redis/v9` 9.4.0 - Redis client for Go
- `prometheus/client_golang` 1.23.2 - Metrics
- `zap` 1.26.0 - Structured logging

**Infrastructure:**
- `@nestjs/schedule` 4.0.0 - Cron jobs
- `@nestjs/websockets` 10.4.20 - WebSocket support
- `@nestjs/event-emitter` 2.0.4 - Event-driven architecture
- `bcrypt` 5.1.1 - Password hashing
- `otplib` 12.0.1 - MFA/TOTP
- `@node-saml/node-saml` 5.1.0 - SAML SSO
- `pdfkit` 0.17.2 - PDF generation
- `json2csv` 6.0.0-alpha.2 - CSV exports

## Configuration

**Environment:**
- `.env` files per service (API, UI, policy-svc, report-svc)
- Environment variables from ConfigService (`@nestjs/config`)
- Required vars documented in `.env.example` files

**Key configs required:**
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - Authentication
- `MFA_ENCRYPTION_KEY` / `SSO_ENCRYPTION_KEY` / `SIEM_ENCRYPTION_KEY` - Data encryption (32 bytes min)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Payments
- `SENDGRID_API_KEY` - Email
- `SENTRY_DSN` - Error tracking

**Build:**
- `api/tsconfig.json` - TypeScript config (ES2021 target, commonjs module)
- `ui/tsconfig.json` - TypeScript config (ES2017 target, bundler module)
- `ui/tailwind.config.ts` - Tailwind with custom Nebula theme
- `ui/next.config.js` - Next.js standalone output

## Platform Requirements

**Development:**
- Node.js 20+
- Go 1.23+
- Docker & Docker Compose
- PostgreSQL 16 / Redis 7 / ClickHouse 24.1 (via Docker)

**Production:**
- Kubernetes (Kustomize + Helm)
- Container registry for images (nebuladns/*)
- External secrets management (AWS Secrets Manager, HashiCorp Vault, or GCP Secret Manager)
- Ingress controller (nginx)
- cert-manager for TLS
- Prometheus for monitoring

## Docker Images

**Base Images:**
- `node:20-alpine` - API and UI
- `golang:1.23-alpine` - Policy service, Report service (build stage)
- `alpine:latest` - Policy service runtime
- `postgres:16-alpine` - PostgreSQL
- `redis:7-alpine` - Redis
- `clickhouse/clickhouse-server:24.1` - ClickHouse

**Build Stages (API Dockerfile):**
1. `development` - Dev server with hot reload
2. `build` - Compile TypeScript
3. `production` - Minimal runtime image

## Service Ports

| Service | Dev Port | Internal Port | Purpose |
|---------|----------|---------------|---------|
| API | 4010 | 3000 | NestJS backend |
| UI | 4011 | 3000 | Next.js frontend |
| PostgreSQL | 4432 | 5432 | Main database |
| Redis | 4379 | 6379 | Cache/pub-sub |
| ClickHouse | 4123/4900 | 8123/9000 | Analytics |
| Policy Service | 4080 | 8080 | DNS policy engine |
| Report Service | 4090 | 8080 | Report worker |
| Unbound | 5354 | 53 | DNS resolver |
| dnsdist DoT | 4853 | 853 | DNS over TLS |
| dnsdist DoH | 4443 | 443 | DNS over HTTPS |

---

*Stack analysis: 2026-01-17*
