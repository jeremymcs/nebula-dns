# Project Research Summary

**Project:** Nebula DNS v1.3 Production Readiness
**Domain:** Multi-tenant DNS Security SaaS - DigitalOcean Kubernetes Deployment
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

Nebula DNS is a production-ready multi-tenant DNS security SaaS platform transitioning from Docker Compose to DigitalOcean Kubernetes (DOKS) with managed PostgreSQL, Redis/Valkey, and ClickHouse Cloud. The existing platform has shipped 95 requirements across 23 phases (control plane, data plane, admin features, MSP functionality). v1.3 focuses on production deployment hardening and comprehensive test coverage to support 100K-999K queries/day for 1-10 initial tenants.

The recommended approach leverages DOKS with DigitalOcean managed services to reduce operational complexity while maintaining the existing three-tier architecture (control plane: Next.js/NestJS, data plane: dnsdist/policy-svc/Unbound, storage: managed databases). Critical success factors include: (1) DNS-specific Kubernetes configurations (UDP health checks, StatefulSet for Unbound, dual LoadBalancers for redundancy), (2) ClickHouse Cloud schema migration without cluster-aware syntax, (3) test suite with 70/20/10 distribution (unit/integration/E2E) avoiding retroactive coverage vanity metrics, and (4) managed service integration patterns for PgBouncer connection pooling and Valkey compatibility.

Key risks center on DNS protocol nuances in Kubernetes (UDP conntrack race conditions, session affinity hotspotting), ClickHouse Cloud schema incompatibilities (ON CLUSTER syntax fails in Cloud), and test coverage false confidence (high % with weak assertions). Mitigation strategies include exec-based health checks testing actual DNS queries, environment-aware ClickHouse schema (detect Cloud vs self-hosted), and assertion density enforcement (>3 assertions per test) focused on critical paths rather than blanket 95% coverage.

## Key Findings

### Recommended Stack

**Testing Infrastructure:**
The stack combines proven NestJS/Next.js testing tools with DNS-specific validation frameworks. Jest (29.7.0+) with @nestjs/testing handles unit tests, Supertest provides HTTP integration testing, and Testcontainers (11.11.0) delivers real PostgreSQL/Redis/ClickHouse instances for deterministic integration tests. Playwright (1.58.2) is strongly recommended over Cypress for E2E testing (2-6x faster, 1.8% vs 6.5% flakiness). Go testing uses stdlib with table-driven tests and go-test-coverage for CI enforcement.

**DigitalOcean Managed Services:**
DOKS 1.30+ provides container orchestration with integrated autoscaling. Managed PostgreSQL 16+ includes built-in PgBouncer (25 connections/GB RAM, transaction mode), automated backups, and HA standby nodes. Managed Valkey (7.2 equivalent, Redis-compatible) replaces discontinued Managed Redis (EOL June 2025), offering RDMA support and higher throughput. ClickHouse Cloud handles analytics with official @clickhouse/client (1.17.0), streaming support, and managed scaling.

**Core technologies:**
- **Helm 3.14+:** Package management — industry standard (75% adoption), release history/rollback, existing helm/safedns chart in project
- **Kustomize (kubectl built-in):** Environment overlays — bundled with kubectl, existing k8s/overlays for secrets/configs
- **External Secrets Operator:** Secrets management — syncs DO/Vault/AWS secrets to K8s, prevents plain-text in repos
- **cert-manager + external-dns:** TLS automation — DNS-01 ACME for wildcard certs, automatic LoadBalancer IP → DNS record sync

**Critical version requirements:**
- PostgreSQL 16+ for PgBouncer integration (14+ minimum)
- Valkey 7.2 (Managed Redis discontinued June 30, 2025, auto-converts existing clusters)
- ClickHouse Cloud latest (avoid self-hosted in-cluster due to PVC resizing complexity)
- Kubernetes 1.30+ (DOKS current stable)

### Expected Features

**Must have (table stakes):**
- **Unit Test Coverage (60%)** — API has ~60 spec files, need admin modules (phases 19-21) covered
- **Integration Tests (all modules)** — Expand beyond existing ClickHouse/Redis/session tests to full module coverage with real DBs
- **E2E Tests (API + UI)** — Expand 20 Playwright specs to cover admin flows, MSP workflows, billing paths
- **Health Check Endpoints** — Existing /health in API + policy-svc, distinguish liveness vs readiness
- **Graceful Shutdown** — SIGTERM handling with connection draining for zero-downtime deploys
- **Database Migrations (Automated)** — Existing db-migration-job.yaml via Helm hooks, validate with managed PostgreSQL
- **Secrets Management** — K8s Secrets + rotation strategy (manual initially, automate in v2)
- **DNS Failover** — Dual LoadBalancers (dns1, dns2) with external-dns for redundancy
- **Backup & Restore** — PostgreSQL PITR via DO managed service, ClickHouse Cloud automated backups
- **CI/CD Pipeline** — Build → test → push (DO Container Registry) → deploy (staging auto, prod manual approval)
- **Load Testing Baseline** — Existing k6 scripts (dns-load-test.js, api-load-test.js), run against DOKS staging to establish SLOs

**Should have (differentiators):**
- **Performance Testing in CI** — k6 with pass/fail thresholds (policy eval <50ms p95, API <200ms p95)
- **Synthetic Monitoring** — External probe sending real DNS queries from multiple regions
- **SLO Dashboards** — 99.9% DNS availability (43min downtime/month), error budget tracking
- **Automated Incident Detection** — Prometheus alerting rules + PagerDuty integration (existing Slack/PagerDuty support)
- **Auto-Scaling (HPA)** — Custom metrics for DNS queries/sec (not just CPU), policy-svc scales on query rate
- **Distributed Tracing** — OpenTelemetry for dnsdist→policy-svc→Redis flow (nice-to-have, not blocking)

**Defer (v2+):**
- **Multi-Region Failover** — Single region sufficient for 1-10 tenants initially
- **Chaos Engineering** — Validate stability first before proactive failure injection
- **Canary Deployments** — Blue-green simpler for initial production (rolling updates with Helm)
- **Visual Regression Testing** — Low ROI for admin-focused UI
- **Cost Monitoring per Tenant** — Already tracking usage for billing, extend later
- **Feature Flags for Everything** — Use only for deployment strategies (canary release), not every feature

### Architecture Approach

**Current Docker Compose → Target DOKS Transformation:**
The existing three-tier architecture (control plane: Next.js UI + NestJS API, data plane: dnsdist + policy-svc + Unbound, storage: PostgreSQL + Redis + ClickHouse) moves from Docker containers to Kubernetes Deployments/StatefulSets with external managed services. Key architectural changes: (1) dnsdist deploys as Deployment with dual LoadBalancer services (dns1, dns2) for DNS redundancy, (2) Unbound converts from Deployment to StatefulSet with persistent cache volumes (stable pod identity required), (3) policy-svc scales horizontally as standard Deployment, (4) API connects to managed PostgreSQL via PgBouncer connection pool, (5) ClickHouse moves from in-cluster container to external Cloud service.

**Major components:**
1. **dnsdist (Deployment)** — DoT/DoH termination, tenant identification, rate limiting. 2+ replicas with pod anti-affinity, HPA on queries/sec. Dual LoadBalancers (dns1, dns2) for redundancy. External-dns creates A records automatically.
2. **Policy Service (Deployment)** — O(1) policy evaluation, Redis cache management, ClickHouse logging. 3+ replicas, connects to managed Valkey (TLS) and ClickHouse Cloud (HTTPS).
3. **Unbound (StatefulSet)** — Recursive DNS resolution, DNSSEC validation. Stable pod identity with persistent cache volumes (ReadWriteOnce PVCs). Headless service for stable DNS names.
4. **API (Deployment)** — NestJS REST API, TypeORM with managed PostgreSQL via PgBouncer. 2+ replicas, HPA based on CPU. Publishes policy updates to Redis pub/sub.
5. **UI + Admin UI (Deployments)** — Next.js static builds, nginx-ingress for HTTPS. Runtime environment variables (not NEXT_PUBLIC_ build-time).
6. **Infrastructure (cert-manager, external-dns, External Secrets Operator)** — TLS automation (DNS-01 ACME), LoadBalancer IP sync to DO DNS, external secret management.

**Data flow changes (Docker Compose → DOKS):**
- PostgreSQL: Direct :5432 no SSL → PgBouncer :25061 with SSL required (transaction mode)
- Redis: Direct :6379 no auth → Managed Valkey :25061 TLS with password auth
- ClickHouse: HTTP :8123 local → HTTPS :8443 external Cloud
- DNS query: Single dnsdist container → LoadBalancer → multiple dnsdist pods (load balanced) → policy-svc ClusterIP → multiple policy-svc pods → unbound-0/unbound-1 (StatefulSet headless service)

### Critical Pitfalls

1. **DNS Health Checks Use TCP While Production Traffic Uses UDP** — Kubernetes tcpSocket probes mark pods healthy when port binds, but UDP DNS queries fail silently. Use exec-based health checks testing actual DNS queries (`dnsdist -e 'queryRaw(...)'`) instead of TCP socket probes.

2. **UDP Conntrack Race Conditions Cause Silent Packet Loss** — Concurrent A/AAAA queries from same client trigger Linux kernel conntrack bugs, resulting in 5-15% packet loss under load. Requires kernel 5.10+, `externalTrafficPolicy: Local`, and conntrack timeout tuning.

3. **ClickHouse Cloud vs Self-Hosted Schema Incompatibilities** — `ON CLUSTER` and `Replicated*` table engines fail on ClickHouse Cloud. Need environment-aware schema creation (detect Cloud via env var, use `MergeTree()` instead of `ReplicatedMergeTree`).

4. **ClickHouse Partition Explosion from High-Cardinality tenant_id** — Partitioning by `(tenant_id, toYYYYMMDD(timestamp))` creates 1000+ partitions in multi-tenant system. Use time-only partitioning (`toYYYYMM(timestamp)`) and push tenant_id into ORDER BY for selectivity.

5. **Next.js NEXT_PUBLIC_ Environment Variables Baked at Build Time** — NEXT_PUBLIC_API_URL replaced by bundler at build time, can't use single Docker image across environments. Refactor to server-side env vars or next-runtime-env library for runtime configuration.

6. **DNS-over-TLS Certificate Rotation Requires dnsdist Restart** — dnsdist loads certs at startup, doesn't watch filesystem. Cert-manager renews Let's Encrypt every 90 days but dnsdist serves expired certs. Implement cert-reloader sidecar with inotify + `reloadAllCertificates()` console API.

7. **Test Coverage Metrics Create False Confidence** — Retroactive tests achieve 85% coverage with weak assertions like `expect(result).toBeDefined()`. Enforce assertion density (>3 per test), focus on critical paths (auth, billing, DNS evaluation), use 70/20/10 distribution (unit/integration/E2E) instead of blanket 95% coverage target.

8. **Unbound Requires StatefulSet Not Deployment** — Deployment with Unbound loses cache on restarts, can't maintain PVC affinity. Use StatefulSet with volumeClaimTemplates for stable pod identity and persistent cache (80% hit rate vs 20% with cache thrashing).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 24: DigitalOcean DOKS Deployment & Migration (4 weeks)

**Rationale:** Infrastructure foundation must be established before test suite validation. Managed service provisioning comes first (get connection strings), then DOKS cluster setup, then database initialization, then core services deployment, then ingress/DNS configuration. This phase addresses the highest-risk items: ClickHouse schema migration, managed database SSL configuration, Next.js environment variable handling.

**Delivers:**
- DOKS cluster with managed PostgreSQL, Valkey, ClickHouse Cloud
- Helm deployment pipeline with automated migrations
- cert-manager + external-dns automation for TLS and DNS records
- Dual LoadBalancers (dns1, dns2) with health-based routing
- StatefulSet for Unbound with persistent cache
- Production-ready secrets management (K8s Secrets + rotation runbook)

**Addresses features from FEATURES.md:**
- Database Migrations (Automated) via Helm hooks
- Secrets Management via K8s Secrets + External Secrets Operator
- DNS Failover via dual LoadBalancers
- Backup & Restore via managed service automation
- SSL/TLS Certificates via cert-manager + Let's Encrypt

**Avoids pitfalls from PITFALLS.md:**
- ClickHouse Cloud schema incompatibility (Week 1: environment-aware schema)
- PostgreSQL SSL certificate with `url` parameter (Week 1: individual connection params)
- Redis → Valkey incompatibility (Week 1: audit Redis commands, test locally)
- Next.js NEXT_PUBLIC_ build-time vars (Week 1: refactor to server-side env)
- StatefulSet for Unbound (Week 2: convert from Deployment)
- Certificate rotation restart requirement (Week 2: cert-reloader sidecar)
- UDP load balancing session affinity (Week 2: configure sessionAffinityConfig)

**Week-by-week breakdown:**

**Week 1: Managed Service Provisioning + Database Migration**
- Provision DO Managed PostgreSQL (2GB, PgBouncer pool), Valkey (2GB), ClickHouse Cloud
- Create DOKS cluster (1.30+, 3 nodes × 4GB RAM)
- Install infrastructure (nginx-ingress, cert-manager, external-dns, External Secrets Operator)
- Create Kubernetes Secrets (DO API token, database credentials)
- Refactor API to use individual DB connection params (not `url`)
- Audit Redis commands for Valkey compatibility
- Create environment-aware ClickHouse schema (detect Cloud, use MergeTree not Replicated*)
- Run PostgreSQL migrations via Helm pre-install hook
- Initialize ClickHouse schema (dns_queries table with time-only partitioning, ORDER BY tenant_id first)

**Week 2: Core Services Deployment**
- Deploy policy-svc (connect to Valkey TLS, ClickHouse HTTPS)
- Convert Unbound to StatefulSet with PVC for cache
- Deploy dnsdist as Deployment with dual LoadBalancers
- Implement cert-reloader sidecar for dnsdist certificate automation
- Configure sessionAffinityConfig for UDP load balancing
- Deploy API (connect to PgBouncer pool)
- Refactor UI/Admin UI for runtime environment variables (not NEXT_PUBLIC_)
- Deploy UI + Admin UI
- Create Ingress with cert-manager annotations
- Verify DNS propagation (dns1, dns2, app, api, admin)

**Week 3: DNS-Specific Kubernetes Configurations**
- Implement exec-based health checks for dnsdist (test actual DNS queries)
- Distinguish liveness vs readiness probes for all services
- Configure graceful shutdown (SIGTERM handling, connection draining)
- Tune kernel conntrack settings for UDP (`externalTrafficPolicy: Local`)
- Configure Unbound thread count dynamically based on CPU cores
- Increase Unbound cache sizes for multi-tenant workload
- Implement per-tenant rate limiting in dnsdist (Redis counters)
- Configure HPA with custom metrics (queries per second, not just CPU)
- Set resource requests/limits based on load testing data

**Week 4: Operational Readiness**
- Create incident runbooks (DNS down, DB down, Redis down, policy-svc crash, certificate expiration)
- Configure Prometheus alerting rules (query success rate, policy eval latency, connection pool exhaustion)
- Set up SLO tracking (99.9% DNS availability, p95 latency targets)
- Deploy synthetic monitoring (external probe from multiple regions)
- Run load tests (100K-999K queries/day, 1-10 tenants)
- Document rollback procedures (Helm rollback, database restore)
- Create production deployment runbook

**Research flags:** This phase requires minimal additional research (HIGH confidence). Standard Kubernetes patterns with DNS-specific configurations well-documented. ClickHouse schema migration tested on Cloud trial before production.

---

### Phase 25: Comprehensive Test Suite (4 weeks)

**Rationale:** Test suite deployment comes after infrastructure is stable to validate against real DOKS environment. Focus on critical path coverage (auth, billing, admin features from phases 19-21, DNS evaluation) rather than blanket 95% coverage. Test environment should mirror production (ephemeral namespaces in DOKS, real managed services).

**Delivers:**
- API unit tests expanded to 80%+ coverage of new/modified code (not retroactive legacy)
- Integration tests with Testcontainers (real PostgreSQL, Redis, ClickHouse)
- E2E tests (API) covering all 95 shipped requirements
- E2E tests (UI) covering admin flows, MSP workflows, billing paths (expand from 20 to 60+ specs)
- Go unit tests for policy-svc with table-driven patterns
- Load testing baseline with SLO thresholds (policy eval <50ms p95, API <200ms p95)
- CI/CD pipeline with test gates (unit → integration → E2E → load tests)

**Addresses features from FEATURES.md:**
- Unit Test Coverage (expand admin modules)
- Integration Tests (all modules with real DBs)
- E2E Tests (API + UI complete coverage)
- Load Testing Baseline (k6 against DOKS staging)
- Performance Testing in CI (thresholds as code)

**Avoids pitfalls from PITFALLS.md:**
- Test coverage false confidence (assertion density >3 per test)
- Retroactive test time waste (focus on critical paths, grandfather legacy)
- Integration test database pollution (transaction rollback per test)
- Over-mocking hides integration issues (70/20/10 distribution, real services)
- Playwright tests slow and brittle (parallel execution, API data setup, auto-waiting)

**Week-by-week breakdown:**

**Week 1: Test Infrastructure**
- Configure Testcontainers for API integration tests (PostgreSQL 16, Redis 7, ClickHouse)
- Create test database reset script for CI
- Implement transaction rollback for integration tests
- Set up test fixtures factory (unique identifiers per test)
- Create ephemeral test namespace pattern in DOKS
- Configure Playwright with parallel workers (4+)
- Refactor E2E data setup to use API (not UI clicks)
- Remove hardcoded waits, use auto-waiting selectors

**Week 2: API Test Expansion**
- Expand unit tests for admin modules (phases 19-21: user management, billing operations, alerting integrations)
- Write integration tests for admin features with real database
- Create E2E tests for admin API endpoints (95 requirements coverage)
- Test multi-tenant isolation in integration tests
- Validate policy cache invalidation with real Redis pub/sub
- Test ClickHouse query logging with real inserts

**Week 3: UI Test Expansion**
- Expand Playwright specs for admin flows (mission control, tenant management, impersonation)
- Test MSP workflows (client management, templates, cross-client reporting)
- Test billing paths (payment methods, invoices, usage tracking)
- Validate tier-based feature visibility (home/enterprise/msp)
- Test graceful degradation (suspended tenants, grace period banners)
- Implement Page Object Model for new flows

**Week 4: Load Testing & CI Integration**
- Run k6 dns-load-test.js against DOKS staging (100K-999K queries/day)
- Run k6 api-load-test.js with thresholds (p95 <200ms, error rate <1%)
- Establish baseline SLOs (DNS p95 <50ms, API p95 <200ms, 99.9% availability)
- Integrate tests into CI/CD pipeline (unit → integration → E2E → load)
- Set up test result reporting (coverage trends, failure rates)
- Create test maintenance runbook (quarterly audit, link tests to requirements)

**Research flags:** Standard testing patterns (HIGH confidence). Testcontainers and Playwright well-documented. Load testing thresholds may need adjustment based on actual DOKS performance.

---

### Phase Ordering Rationale

**Why Phase 24 (Deployment) before Phase 25 (Testing):**
- Infrastructure must be stable before validation
- Integration tests require real DOKS environment (not just Docker Compose)
- Load tests need production-like managed services to establish accurate SLOs
- E2E tests validate actual deployed services (not mocks)

**Why Week 1 focuses on managed services first:**
- Get connection strings before DOKS cluster setup
- ClickHouse schema must be Cloud-compatible before migration
- PostgreSQL SSL configuration blocks API deployment

**Why Week 2 includes core services deployment:**
- DNS service (dnsdist + policy-svc + Unbound) is critical path
- API depends on DNS service for testing
- UI depends on API for testing

**Why Week 3 addresses DNS-specific configurations:**
- Can only validate UDP health checks with deployed services
- Conntrack tuning requires kernel access (not possible in Docker Compose)
- Load balancing behavior only visible with multiple pods

**Why Week 4 operational readiness comes last:**
- Need deployed services to create runbooks
- Load testing establishes actual SLO baselines
- Alerting rules based on observed metrics

**How this avoids pitfalls from research:**
- ClickHouse schema fixed before migration (Week 1)
- PostgreSQL SSL refactored before API deployment (Week 1)
- Valkey compatibility validated before Redis migration (Week 1)
- StatefulSet for Unbound prevents cache thrashing (Week 2)
- Certificate rotation automated prevents downtime (Week 2)
- DNS health checks test UDP not just TCP (Week 3)
- Test suite focuses on critical paths not blanket coverage (Phase 25 Week 2-3)

### Research Flags

**Phases likely needing deeper research during planning:**
- **None** — Both phases have HIGH confidence from research. DNS-specific Kubernetes patterns, managed service integration, and testing strategies are well-documented with authoritative sources.

**Phases with standard patterns (skip research-phase):**
- **Phase 24** — Kubernetes deployment with managed services follows established patterns. DOKS documentation covers integration points. ClickHouse Cloud migration strategy validated from multiple production reports.
- **Phase 25** — Testing strategies (Jest, Playwright, Testcontainers, k6) have official documentation and mature community patterns. NestJS testing patterns standard in ecosystem.

**Areas requiring validation during execution:**
- ClickHouse Cloud schema: Test on trial account before production migration (Week 1)
- Valkey command compatibility: Run integration tests locally before migration (Week 1)
- UDP conntrack tuning: Test under load in staging before production (Week 3)
- Load testing thresholds: May need adjustment based on actual DOKS performance (Week 4)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | **HIGH** | Official docs for all technologies (DOKS, Helm, Kubernetes), existing project uses Helm/Kustomize, Playwright benchmarks from authoritative sources (2026 guides), ClickHouse Cloud deployment models well-documented |
| **Features** | **HIGH** | DNS SaaS testing best practices from multiple 2026 sources, Kubernetes DNS patterns from official docs, production readiness checklists from DigitalOcean and K8s community, existing project has 95 shipped requirements (clear scope) |
| **Architecture** | **HIGH** | StatefulSet vs Deployment patterns from K8s official docs, managed service integration from DigitalOcean official docs (PostgreSQL connection pools, Valkey migration), ClickHouse Cloud vs self-hosted from production reports (CloudQuery, Langfuse), existing k8s/base manifests provide baseline |
| **Pitfalls** | **HIGH** | DNS health checks from K8s networking guides (2026), ClickHouse schema incompatibilities from migration reports (HIGH confidence), certificate rotation from dnsdist official docs, test coverage patterns from NestJS best practices (Amplication), Next.js env vars from community technical articles |

**Overall confidence:** **HIGH**

All four research areas have HIGH confidence ratings. Stack choices backed by official documentation and existing project configuration. Features grounded in DNS SaaS production requirements with clear table stakes vs differentiators. Architecture patterns validated with Kubernetes official docs and managed service provider documentation. Pitfalls identified from authoritative sources (official docs, production migration reports, technical deep-dives).

### Gaps to Address

**During Phase 24 Week 1:**
- **Valkey command compatibility:** Audit all Redis commands in codebase (`grep -r "redis\." api/src policy-svc/internal`), cross-reference with Valkey docs, test locally against Valkey Docker image before migration. **Confidence:** MEDIUM (Valkey claims 100% Redis protocol compatibility, but need empirical validation).

- **ClickHouse Cloud region selection:** Benchmark latency between DOKS region and ClickHouse Cloud regions (AWS us-east-1, GCP us-east4). Target <10ms latency for synchronous query logging. **Confidence:** MEDIUM (latency varies by network path, need empirical testing).

**During Phase 24 Week 3:**
- **Kernel conntrack tuning:** Verify DOKS node kernel version (need 5.10+ for conntrack fixes), test `net.netfilter.nf_conntrack_udp_timeout` tuning under load. **Confidence:** MEDIUM (conntrack issues depend on kernel version and query patterns).

**During Phase 25 Week 4:**
- **Load testing SLO thresholds:** Initial targets (DNS p95 <50ms, API p95 <200ms) based on research, may need adjustment after running k6 against DOKS staging. **Confidence:** MEDIUM (thresholds depend on actual hardware performance and managed service latency).

**Ongoing (not blocking):**
- **Distributed tracing ROI:** OpenTelemetry instrumentation for dnsdist→policy-svc→Redis deferred to v1.4. Need to evaluate debugging value vs instrumentation overhead after 30 days production data. **Confidence:** LOW (tracing overhead varies by query volume, benefits unclear until production traffic).

## Sources

### Primary (HIGH confidence - Official Documentation)

**Kubernetes & DOKS:**
- [Kubernetes Official Documentation](https://kubernetes.io/docs/) — StatefulSet patterns, health checks, DNS pod service
- [DigitalOcean Kubernetes Documentation](https://docs.digitalocean.com/products/kubernetes/) — DOKS best practices, autoscaling, managed services integration
- [DigitalOcean PostgreSQL Connection Pools](https://docs.digitalocean.com/products/databases/postgresql/how-to/manage-connection-pools/) — PgBouncer transaction mode, connection limits
- [DigitalOcean Managed Caching (Valkey)](https://docs.digitalocean.com/products/databases/redis/) — Valkey migration, replication, connection pooling

**DNS Services:**
- [DNSDist Official Documentation](https://www.dnsdist.org/) — TLS certificate management, load balancing, console API
- [Unbound Performance Tuning](https://unbound.docs.nlnetlabs.nl/en/latest/topics/core/performance.html) — Thread configuration, cache sizing, multi-tenant optimization

**ClickHouse:**
- [ClickHouse Official JS Client](https://github.com/ClickHouse/clickhouse-js) — @clickhouse/client 1.17.0, streaming, TLS configuration
- [ClickHouse Partitioning Documentation](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree/#table_engine-mergetree-partitioning) — Partition key design, part merging

**Testing Frameworks:**
- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing) — @nestjs/testing, Supertest integration
- [Playwright Official Documentation](https://playwright.dev/docs/) — Parallel execution, auto-waiting, release notes
- [Next.js Testing Guide](https://nextjs.org/docs/app/guides/testing) — Playwright integration

**Kubernetes Ecosystem:**
- [Helm Official Documentation](https://helm.sh/docs/) — Chart best practices, hooks, rollback
- [cert-manager Documentation](https://cert-manager.io/docs/) — ACME DNS-01, DigitalOcean integration
- [External Secrets Operator](https://external-secrets.io/latest/) — Secret management, providers

### Secondary (MEDIUM confidence - Technical Articles & Community)

**ClickHouse Deployment:**
- [ClickHouse Cloud vs Self-Hosted (Tinybird 2026)](https://www.tinybird.co/blog/clickhouse-deployment-options) — Deployment models, managed vs self-hosted tradeoffs
- [CloudQuery ClickHouse Experience (2026)](https://www.cloudquery.io/blog/six-months-with-clickhouse-at-cloudquery) — Production lessons, ORDER BY optimization
- [ClickHouse Partitioning Best Practices (BigData Boutique)](https://bigdataboutique.com/blog/when-to-use-partitioning-in-clickhouse-f2335e) — High-cardinality partition explosion

**Testing Strategies:**
- [Playwright vs Cypress (2026 Enterprise Guide)](https://devin-rosario.medium.com/playwright-vs-cypress-the-2026-enterprise-testing-guide-ade8b56d3478) — Performance benchmarks, flakiness comparison
- [NestJS Testing Best Practices (Amplication)](https://amplication.com/blog/best-practices-and-common-pitfalls-when-testing-my-nestjs-app) — Common pitfalls, mocking patterns
- [Go Testing Excellence (dasroot.net 2026)](https://dasroot.net/posts/2026/01/go-testing-excellence-table-driven-tests-mocking/) — Table-driven tests, TestContainers

**Kubernetes DNS & Networking:**
- [Kubernetes DNS Health Checks (OneUptime 2026)](https://oneuptime.com/blog/post/2026-01-08-kubernetes-network-health-checks/view) — UDP vs TCP probes, exec-based checks
- [DNS in Multi-Tenant Environments (KodeKloud CKS)](https://notes.kodekloud.com/docs/Certified-Kubernetes-Security-Specialist-CKS/Minimize-Microservice-Vulnerabilities/DNS-in-Multi-Tenant-Environments) — CoreDNS namespace isolation, NetworkPolicies

**Next.js & Environment Variables:**
- [Next.js Environment Variables in Kubernetes (Medium 2026)](https://medium.com/@raajeew/nextjs-application-environment-variables-issue-on-kubernetes-b2b885704a26) — NEXT_PUBLIC_ build-time binding, runtime solutions
- [Next.js Runtime Environment Variables (GitHub Discussion)](https://github.com/vercel/next.js/discussions/87229) — Community workarounds, next-runtime-env

**Managed Service Integration:**
- [DigitalOcean Redis to Valkey Migration (ScaleGrid)](https://scalegrid.io/blog/how-to-keep-running-redis-on-digitalocean-after-redis-licensing-changes/) — Migration timeline, compatibility
- [cert-manager + external-dns on DOKS (Polar Labs)](https://polarlabs.ca/stories/digital-ocean-kubernetes-cert-manager-external-dns) — DNS-01 ACME setup

### Tertiary (LOW confidence - Needs Validation)

**Performance Tuning:**
- [CoreDNS Performance Optimization (Medium)](https://medium.com/@GiteshWadhwa/optimizing-dns-resolution-in-kubernetes-best-practices-for-coredns-performance-e3f6ed041bbb) — Cache sizing recommendations (need empirical validation for multi-tenant)
- [ClickHouse Fine-Tuning for Time Series (LogAlarm)](https://medium.com/logalarm-devs/clickhouse-fine-tuning-maximize-performance-for-time-series-and-logs-5b6f6943ca7c) — Merge settings (need testing with actual query patterns)

**Chaos Engineering:**
- [Chaos Testing Guide (Katalon)](https://katalon.com/resources-center/blog/chaos-testing-a-complete-guide) — DNS failure injection concepts (no DNS-specific implementation details)

**Load Testing:**
- [k6 Documentation](https://grafana.com/docs/k6/latest/) — Load testing patterns (existing scripts in project, need DOKS-specific tuning)

---

**Research completed:** 2026-02-11
**Ready for roadmap:** Yes

**Next steps:**
1. Load this SUMMARY.md into roadmap creation context
2. Use Phase 24/25 suggestions as starting point
3. Break down each phase into detailed requirements (5-7 per phase)
4. Create phase plans (PLAN.md) with implementation steps
5. Validate ClickHouse Cloud schema on trial account before Phase 24 Week 1
6. Test Valkey compatibility locally before Phase 24 Week 1
