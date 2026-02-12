# Requirements: Nebula DNS v1.3 Production Readiness

// Nebula DNS v1.3 Requirements
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Defined:** 2026-02-11
**Core Value:** Get the platform tested, deployed on DigitalOcean, and handling real DNS traffic

## v1.3 Requirements

Requirements for production readiness milestone. Each maps to roadmap phases.

### Deployment & Infrastructure

- [ ] **DEPLOY-01**: DOKS cluster provisioned with 3+ nodes running Kubernetes 1.30+
- [ ] **DEPLOY-02**: Managed PostgreSQL provisioned with PgBouncer connection pooling and SSL
- [ ] **DEPLOY-03**: Managed Valkey provisioned with TLS and password auth (replacing Redis)
- [ ] **DEPLOY-04**: ClickHouse Cloud provisioned with environment-aware schema (MergeTree, not Replicated)
- [ ] **DEPLOY-05**: API deployed as Deployment with Helm, connecting to managed PostgreSQL via PgBouncer
- [ ] **DEPLOY-06**: Policy Service deployed as Deployment connecting to managed Valkey and ClickHouse Cloud
- [ ] **DEPLOY-07**: Unbound deployed as StatefulSet with persistent cache volumes
- [ ] **DEPLOY-08**: dnsdist deployed as Deployment with dual LoadBalancers (dns1, dns2) for DNS failover
- [ ] **DEPLOY-09**: UI and Admin UI deployed with runtime environment variables (not NEXT_PUBLIC_ build-time)
- [ ] **DEPLOY-10**: cert-manager configured with Let's Encrypt DNS-01 ACME for wildcard TLS certificates
- [ ] **DEPLOY-11**: external-dns configured to sync LoadBalancer IPs to DigitalOcean DNS records
- [ ] **DEPLOY-12**: Kubernetes Secrets created for all credentials with documented rotation procedure
- [ ] **DEPLOY-13**: Database migrations run automatically via Helm pre-install/pre-upgrade hooks

### Testing

- [ ] **TEST-01**: API unit tests expanded to cover admin modules (phases 19-21: user management, billing, alerting)
- [ ] **TEST-02**: API integration tests using Testcontainers with real PostgreSQL, Redis, and ClickHouse
- [ ] **TEST-03**: API E2E tests covering all critical endpoint flows (auth, admin, billing, MSP, impersonation)
- [ ] **TEST-04**: UI E2E tests expanded from 20 to 60+ Playwright specs covering admin, MSP, and billing flows
- [ ] **TEST-05**: Go policy-svc unit tests with table-driven patterns for policy evaluation
- [ ] **TEST-06**: Go policy-svc integration tests validating Redis cache and ClickHouse logging
- [ ] **TEST-07**: Load testing baseline established with k6 against DOKS staging (DNS and API endpoints)
- [ ] **TEST-08**: Test assertion density enforced (>3 assertions per test, no toBeDefined()-only tests)

### Operations

- [ ] **OPS-01**: Liveness and readiness probes configured for all services (exec-based for DNS services)
- [ ] **OPS-02**: Graceful shutdown with SIGTERM handling and connection draining for all services
- [ ] **OPS-03**: CI/CD pipeline: build, test, push to DO Container Registry, deploy to staging (auto), production (manual)
- [ ] **OPS-04**: Incident runbooks created for DNS down, DB down, Redis down, policy-svc crash, cert expiration
- [ ] **OPS-05**: Prometheus alerting rules configured for query success rate, policy eval latency, connection pool exhaustion
- [ ] **OPS-06**: SLO tracking dashboards in Grafana (99.9% DNS availability, p95 latency targets)
- [ ] **OPS-07**: Synthetic monitoring deployed (external probe sending DNS queries from multiple regions)
- [ ] **OPS-08**: HPA configured with custom DNS query metrics for policy-svc auto-scaling
- [ ] **OPS-09**: Backup verification — PostgreSQL PITR and ClickHouse Cloud automated backups confirmed working
- [ ] **OPS-10**: Production deployment and rollback runbook documented

## Future Requirements (v2+)

### Deployment

- **DEPLOY-14**: Multi-region deployment with GeoDNS routing
- **DEPLOY-15**: Canary deployment strategy with traffic splitting by tenant_id
- **DEPLOY-16**: Terraform/Pulumi infrastructure-as-code for reproducible environments

### Testing

- **TEST-09**: Chaos engineering — DNS failure injection, latency simulation
- **TEST-10**: Visual regression testing for admin UI
- **TEST-11**: Contract testing with Pact for API consumers
- **TEST-12**: Distributed tracing with OpenTelemetry for cross-service debugging

### Operations

- **OPS-11**: Automated secrets rotation via External Secrets Operator + Vault
- **OPS-12**: Cost monitoring per tenant (infrastructure attribution)
- **OPS-13**: ML-based anomaly detection for DNS query patterns

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-cloud deployment | Premature optimization, DigitalOcean sufficient for 1-10 tenants |
| Custom CI/CD platform | GitHub Actions sufficient, don't reinvent |
| Self-hosted monitoring stack | Use managed services to reduce ops burden |
| Zero-downtime database migrations | Brief maintenance windows acceptable at current scale |
| Geo-distributed DNS resolution | Single region handles 100K-999K queries/day |
| Machine learning anomaly detection | Insufficient data at current scale, need 6+ months |
| Feature flags for every feature | Use only for deployment strategies |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPLOY-01 | — | Pending |
| DEPLOY-02 | — | Pending |
| DEPLOY-03 | — | Pending |
| DEPLOY-04 | — | Pending |
| DEPLOY-05 | — | Pending |
| DEPLOY-06 | — | Pending |
| DEPLOY-07 | — | Pending |
| DEPLOY-08 | — | Pending |
| DEPLOY-09 | — | Pending |
| DEPLOY-10 | — | Pending |
| DEPLOY-11 | — | Pending |
| DEPLOY-12 | — | Pending |
| DEPLOY-13 | — | Pending |
| TEST-01 | — | Pending |
| TEST-02 | — | Pending |
| TEST-03 | — | Pending |
| TEST-04 | — | Pending |
| TEST-05 | — | Pending |
| TEST-06 | — | Pending |
| TEST-07 | — | Pending |
| TEST-08 | — | Pending |
| OPS-01 | — | Pending |
| OPS-02 | — | Pending |
| OPS-03 | — | Pending |
| OPS-04 | — | Pending |
| OPS-05 | — | Pending |
| OPS-06 | — | Pending |
| OPS-07 | — | Pending |
| OPS-08 | — | Pending |
| OPS-09 | — | Pending |
| OPS-10 | — | Pending |

**Coverage:**
- v1.3 requirements: 31 total
- Mapped to phases: 0
- Unmapped: 31

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
