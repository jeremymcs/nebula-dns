# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nebula DNS is a multi-tenant, enterprise-grade DNS security and content filtering SaaS platform. It blocks malware, phishing, and undesirable content at the DNS level while providing granular policy control and comprehensive analytics.

## Architecture

**Three-tier architecture separating control and data planes:**

- **Control Plane**: NestJS API + Next.js UI for policy management
- **Data Plane**: dnsdist → Policy Service (Go) → Unbound for DNS enforcement
- **Storage**: PostgreSQL (relational), Redis (cache/pub-sub), ClickHouse (analytics)

```
Client DNS Query → dnsdist (tenant ID extraction) → Policy Service (evaluate cache) → Unbound (resolve)
                                                          ↓
                                                    ClickHouse (logs)
```

All entities are scoped by `tenant_id` for multi-tenancy.

## Common Commands

### Docker Compose (Full Stack)
```bash
docker-compose up -d                    # All services
docker-compose --profile dev-tools up -d # With Adminer + RedisInsight
```

### API (NestJS) - Port 4010
```bash
cd api
npm install
npm run start:dev           # Development server
npm run build               # Production build
npm run test                # Unit tests
npm run test:e2e            # E2E tests
npm run test:cov            # Coverage report
npm run lint                # ESLint
npm run migration:generate -- src/database/migrations/Name  # New migration
npm run migration:run       # Apply migrations
npm run seed                # Populate test data
```

### UI (Next.js) - Port 4011
```bash
cd ui
npm install
npm run dev                 # Development server
npm run build               # Production build
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # Interactive Playwright UI
npm run test:e2e:headed     # Headed browser mode
```

### Policy Service (Go) - Port 4080
```bash
cd policy-svc
go mod download
go run cmd/main.go          # Run server
go test ./...               # All tests
go test -bench=.            # Benchmarks
```

### Load Testing
```bash
k6 run scripts/load-testing/api-load-test.js
k6 run scripts/load-testing/dns-load-test.js
```

### Database Migrations (Kubernetes)
```bash
# Deploy with automatic migrations (via Helm hooks)
helm upgrade nebula-dns ./helm/safedns -n nebula-dns --wait

# Manual migration job execution
kubectl apply -f k8s/base/jobs/db-migration-job.yaml
kubectl logs -n nebula-dns job/db-migration

# Rollback last migration
./scripts/rollback-migration.sh

# Interactive migration helper
./scripts/migration-helper.sh

# ClickHouse initialization
kubectl apply -f k8s/base/jobs/clickhouse-init-job.yaml
```

## Service Ports (Docker Compose)

| Service | Port | Purpose |
|---------|------|---------|
| API | 4010 | NestJS backend |
| UI | 4011 | Next.js frontend |
| PostgreSQL | 4432 | Main database |
| Redis | 4379 | Cache/pub-sub |
| ClickHouse | 4123/4900 | Analytics (HTTP/Native) |
| Policy Service | 4080 | DNS policy engine |
| Unbound | 5354 | DNS resolver |
| dnsdist DoT | 4853 | DNS over TLS |
| dnsdist DoH | 4443 | DNS over HTTPS |

## Key Patterns

### Multi-Tenancy
Every table and cache key includes `tenant_id`. JWT tokens are scoped to tenant. No default tenant exists - all queries must specify tenant context.

### Policy Evaluation (O(1))
Policies are cached in Redis using Trie + HashMap structures. The Policy Service subscribes to Redis pub/sub for instant cache invalidation on policy changes.

### Fail-Open Strategy
If Policy Service is unavailable, DNS queries are allowed (configurable via `FAIL_MODE` env var). All decisions are audit logged.

### User Roles
RBAC with roles: `owner`, `admin`, `analyst`, `readonly`

## Code Organization

### API Modules (`api/src/modules/`)
- **auth, users, tenants**: Authentication, user management, multi-tenancy
- **policies, locations, lists, block-pages**: DNS policy management
- **reports, scheduled-reports**: ClickHouse analytics and reporting
- **mfa, sso, api-keys**: Security features
- **agents, doh**: Client agent management, DoH endpoint
- **siem, webhooks**: External integrations
- **payments, subscriptions**: Stripe billing

### UI Pages (`ui/src/app/dashboard/`)
Main dashboard pages for policies, locations, lists, reports, investigate, agents, settings, billing, playbooks, security-score, users.

### Policy Service (`policy-svc/`)
- `cmd/main.go`: Entry point
- `internal/handlers/`: HTTP handlers (Evaluate, LogQuery, Health)
- `internal/policy/`: Policy evaluation logic (Trie, category matching)
- `internal/cache/`: Redis-backed policy cache with pub/sub
- `internal/clickhouse/`: Query logging

## Database Schema

### PostgreSQL
Core tables: `tenants`, `users`, `policies`, `locations`, `lists`, `list_entries`, `block_pages`, `agents`, `api_keys`, `webhooks`, `audit_logs`

### Redis
- `policy:{tenant_id}`: Cached policy snapshots (Hash)
- `ratelimit:{tenant_id}:{location_id}`: Rate limit buckets
- `policy_updates` channel: Pub/sub for cache invalidation

### ClickHouse
- `dns_queries`: High-volume DNS query logs (append-only)
- Materialized views for hourly/daily aggregations

## Key Configuration Files

- `config/dnsdist/dnsdist.conf`: DNS load balancer config
- `config/unbound/unbound.conf`: Recursive resolver config
- `k8s/`: Kubernetes deployment (Kustomize)
- `helm/`: Helm charts
- `monitoring/`: Prometheus + Grafana configs

## API Documentation

Swagger UI available at `http://localhost:4010/api/docs`

All API requests require Bearer token authentication:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:4010/api/v1/policies
```

## Design Documentation

Comprehensive docs in `docs/` directory:
- A-system-design.md: Architecture overview
- B-threat-model.md: Security threat analysis
- C-database-schema.md: Schema details
- D-api-spec.md: API specifications
- E-policy-evaluation-algorithm.md: O(1) algorithm details
- F-dnsdist-routing-approach.md: Tenant extraction logic
- DATABASE-MIGRATIONS.md: Database migration guide (Kubernetes)