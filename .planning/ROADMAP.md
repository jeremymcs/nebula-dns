# Roadmap: Nebula DNS v1.3 Production Readiness

## Milestones

- ✅ **v1.0 Admin Backend** - Phases 1-8 (shipped 2026-01-18)
- ✅ **v1.1 Mission Control Frontend** - Phases 9-16 (shipped 2026-01-19)
- ✅ **v1.2 Admin Roles & Alerting** - Phases 17-23 (shipped 2026-02-03)
- 🚧 **v1.3 Production Readiness** - Phases 24-33 (in progress)

## Phases

<details>
<summary>✅ v1.0 Admin Backend (Phases 1-8) - SHIPPED 2026-01-18</summary>

Phase 1-8 details archived in [milestones/v1-ROADMAP.md](milestones/v1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Mission Control Frontend (Phases 9-16) - SHIPPED 2026-01-19</summary>

Phase 9-16 details archived in [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.2 Admin Roles & Alerting (Phases 17-23) - SHIPPED 2026-02-03</summary>

Phase 17-23 details archived in [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

### 🚧 v1.3 Production Readiness (In Progress)

**Milestone Goal:** Deploy tested platform to DigitalOcean Kubernetes with managed databases, handling real DNS traffic at 100K-999K queries/day for 1-10 tenants.

#### Phase 24: Infrastructure Provisioning
**Goal**: DigitalOcean managed services and DOKS cluster are provisioned, configured, and ready for service deployment
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-11, DEPLOY-12
**Success Criteria** (what must be TRUE):
  1. DOKS cluster is running with 3+ nodes on Kubernetes 1.30+
  2. Managed PostgreSQL is accessible via PgBouncer with SSL connection pooling
  3. Managed Valkey is accessible with TLS and password authentication
  4. ClickHouse Cloud is provisioned and accepting HTTPS connections
  5. cert-manager and external-dns are installed and operational
  6. All service credentials are stored as Kubernetes Secrets with rotation runbook documented
**Plans**: 4 plans

Plans:
- [x] 24-01-PLAN.md — Terraform project structure + VPC + DOKS cluster modules
- [x] 24-02-PLAN.md — Managed databases module (PostgreSQL + PgBouncer + Valkey)
- [x] 24-03-PLAN.md — ClickHouse Cloud module + K8s operators (cert-manager, external-dns)
- [x] 24-04-PLAN.md — Kubernetes Secrets creation + verification + rotation runbook

#### Phase 25: Database Schema Migration
**Goal**: PostgreSQL and ClickHouse schemas are deployed with production-compatible configurations
**Depends on**: Phase 24
**Requirements**: DEPLOY-13, DEPLOY-04 (schema part)
**Success Criteria** (what must be TRUE):
  1. PostgreSQL migrations run successfully via Helm pre-install hook
  2. ClickHouse Cloud schema uses MergeTree (not Replicated*) table engines
  3. ClickHouse dns_queries table uses time-only partitioning (not tenant_id partitioning)
  4. Schema deployment is environment-aware (detects Cloud vs self-hosted)
**Plans**: 2 plans

Plans:
- [x] 25-01-PLAN.md — PostgreSQL migration job direct URI + production Helm values
- [x] 25-02-PLAN.md — Environment-aware ClickHouse schema with full production tables

#### Phase 26: DNS Stack Deployment
**Goal**: DNS resolution stack (dnsdist, Policy Service, Unbound) is deployed and handling queries end-to-end
**Depends on**: Phase 25
**Requirements**: DEPLOY-06, DEPLOY-07, DEPLOY-08
**Success Criteria** (what must be TRUE):
  1. Policy Service is deployed and connected to Valkey and ClickHouse Cloud
  2. Unbound is deployed as StatefulSet with persistent cache volumes
  3. dnsdist is deployed with dual LoadBalancers (dns1, dns2) for DNS redundancy
  4. DNS queries flow from dnsdist → policy-svc → Unbound → response
  5. DNS query logs appear in ClickHouse Cloud
**Plans**: 3 plans

Plans:
- [x] 26-01-PLAN.md — Policy Service Valkey TLS + ClickHouse Cloud HTTPS connections
- [x] 26-02-PLAN.md — Unbound StatefulSet with persistent cache and headless service
- [x] 26-03-PLAN.md — dnsdist DigitalOcean LoadBalancers and Kubernetes service discovery

#### Phase 27: Control Plane Deployment
**Goal**: API and UI are deployed with production TLS and DNS configuration
**Depends on**: Phase 26
**Requirements**: DEPLOY-05, DEPLOY-09, DEPLOY-10
**Success Criteria** (what must be TRUE):
  1. API is deployed and connected to managed PostgreSQL via PgBouncer
  2. UI and Admin UI are deployed with runtime environment variables (not NEXT_PUBLIC_)
  3. Ingress resources are created with cert-manager annotations for TLS
  4. LoadBalancer IPs are synced to DigitalOcean DNS records via external-dns
  5. Users can access app, api, and admin subdomains via HTTPS with valid certificates
**Plans**: 4 plans

Plans:
- [x] 27-01-PLAN.md — API Deployment Helm template with all env vars, secrets, and HPA hardening
- [x] 27-02-PLAN.md — Next.js runtime env var refactoring (NEXT_PUBLIC_ to runtime)
- [x] 27-03-PLAN.md — UI and Admin UI Helm deployment templates
- [x] 27-04-PLAN.md — Ingress + external-dns + TLS certificates + production values

#### Phase 28: Test Infrastructure
**Goal**: Test environments and frameworks are configured for comprehensive testing
**Depends on**: Phase 27
**Requirements**: TEST-02 (Testcontainers), TEST-04 (Playwright config), TEST-07 (k6 setup)
**Success Criteria** (what must be TRUE):
  1. Testcontainers is configured with PostgreSQL, Redis, and ClickHouse images
  2. Playwright is configured with parallel workers and auto-waiting selectors
  3. Ephemeral test namespaces can be created in DOKS staging
  4. Test database reset scripts work in CI environment
  5. k6 is configured to run against DOKS staging endpoints
**Plans**: 5 plans

Plans:
- [ ] 28-01-PLAN.md — Testcontainers setup with PostgreSQL, Redis, ClickHouse containers
- [ ] 28-02-PLAN.md — Database reset scripts (PostgreSQL, Redis, ClickHouse)
- [ ] 28-03-PLAN.md — Playwright configuration improvements and CI integration
- [ ] 28-04-PLAN.md — Ephemeral test namespaces with RBAC and CronJob cleanup
- [ ] 28-05-PLAN.md — k6 staging configuration and load test CI workflow

#### Phase 29: API Test Suite
**Goal**: API has comprehensive test coverage across unit, integration, and E2E layers
**Depends on**: Phase 28
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-05, TEST-06, TEST-08
**Success Criteria** (what must be TRUE):
  1. Admin modules (phases 19-21) have unit tests with >3 assertions per test
  2. Integration tests use real PostgreSQL, Redis, and ClickHouse (not mocks)
  3. E2E tests cover all critical endpoint flows (auth, admin, billing, MSP, impersonation)
  4. Policy-svc has table-driven unit tests for policy evaluation
  5. Policy-svc integration tests validate Redis cache and ClickHouse logging
  6. All tests pass in CI environment
**Plans**: 6 plans in 3 waves

Plans:
- [ ] 29-01-PLAN.md — Expand API unit tests for admin modules (>3 assertions)
- [ ] 29-02-PLAN.md — Convert integration tests to Testcontainers
- [ ] 29-03-PLAN.md — Expand E2E tests for critical endpoint flows
- [ ] 29-04-PLAN.md — Table-driven unit tests for policy-svc
- [ ] 29-05-PLAN.md — Policy-svc integration tests (Redis + ClickHouse)
- [ ] 29-06-PLAN.md — CI configuration for all tests

#### Phase 30: UI Test Suite
**Goal**: UI has comprehensive E2E test coverage expanded from 20 to 60+ Playwright specs
**Depends on**: Phase 29
**Requirements**: TEST-04, TEST-08
**Success Criteria** (what must be TRUE):
  1. Admin flows are covered (mission control, tenant management, impersonation)
  2. MSP workflows are covered (client management, templates, reporting)
  3. Billing paths are covered (payment methods, invoices, usage tracking)
  4. Tier-based feature visibility is validated (home/enterprise/msp)
  5. Tests use API for data setup (not UI clicks)
  6. All Playwright tests pass with <5% flakiness rate
**Plans**: TBD

Plans:
- [ ] 30-01: TBD
- [ ] 30-02: TBD

#### Phase 31: Load Testing & SLOs
**Goal**: Performance baselines and SLOs are established from load testing against DOKS staging
**Depends on**: Phase 30
**Requirements**: TEST-07, OPS-05, OPS-06, OPS-07
**Success Criteria** (what must be TRUE):
  1. k6 DNS load test runs successfully against DOKS staging (100K-999K queries/day)
  2. k6 API load test validates p95 latency thresholds (<200ms API, <50ms policy eval)
  3. SLO tracking dashboards exist in Grafana (99.9% DNS availability, p95 latency targets)
  4. Prometheus alerting rules are configured for query success rate, policy eval latency, connection pool exhaustion
  5. Synthetic monitoring is deployed (external probe from multiple regions)
  6. Load test results document baseline performance metrics
**Plans**: TBD

Plans:
- [ ] 31-01: TBD
- [ ] 31-02: TBD

#### Phase 32: CI/CD Pipeline
**Goal**: Automated pipeline builds, tests, and deploys to staging (auto) and production (manual)
**Depends on**: Phase 31
**Requirements**: OPS-03
**Success Criteria** (what must be TRUE):
  1. Pipeline builds Docker images for all services
  2. Pipeline runs unit tests, integration tests, and E2E tests as gates
  3. Pipeline pushes images to DigitalOcean Container Registry
  4. Pipeline deploys to staging automatically on main branch push
  5. Pipeline deploys to production via manual approval
  6. Failed deployments trigger rollback automatically
**Plans**: TBD

Plans:
- [ ] 32-01: TBD
- [ ] 32-02: TBD

#### Phase 33: Operational Readiness
**Goal**: Platform is production-ready with health checks, monitoring, runbooks, and backup verification
**Depends on**: Phase 32
**Requirements**: OPS-01, OPS-02, OPS-04, OPS-08, OPS-09, OPS-10
**Success Criteria** (what must be TRUE):
  1. All services have liveness and readiness probes (exec-based for DNS services)
  2. All services handle SIGTERM gracefully with connection draining
  3. Incident runbooks exist for DNS down, DB down, Redis down, policy-svc crash, cert expiration
  4. HPA is configured with custom DNS query metrics for policy-svc auto-scaling
  5. PostgreSQL PITR and ClickHouse Cloud automated backups are verified working
  6. Production deployment and rollback runbook is documented
**Plans**: TBD

Plans:
- [ ] 33-01: TBD
- [ ] 33-02: TBD
- [ ] 33-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 24. Infrastructure Provisioning | v1.3 | 4/4 | ✓ Complete | 2026-02-13 |
| 25. Database Schema Migration | v1.3 | 2/2 | ✓ Complete | 2026-02-13 |
| 26. DNS Stack Deployment | v1.3 | 3/3 | ✓ Complete | 2026-02-13 |
| 27. Control Plane Deployment | v1.3 | 4/4 | ✓ Complete | 2026-02-13 |
| 28. Test Infrastructure | v1.3 | 5/5 | ✓ Complete | 2026-02-13 |
| 29. API Test Suite | v1.3 | 6/6 | ✓ Complete | 2026-02-14 |
| 30. UI Test Suite | v1.3 | 0/TBD | Not started | - |
| 31. Load Testing & SLOs | v1.3 | 0/TBD | Not started | - |
| 32. CI/CD Pipeline | v1.3 | 0/TBD | Not started | - |
| 33. Operational Readiness | v1.3 | 0/TBD | Not started | - |

---
*Created: 2026-02-11*
*Last updated: 2026-02-14*
