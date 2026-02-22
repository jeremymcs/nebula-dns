# Nebula DNS

## What This Is

A multi-tenant DNS security and content filtering SaaS platform with an internal operations dashboard (Mission Control). The platform blocks malware, phishing, and undesirable content at the DNS level while providing granular policy control, comprehensive analytics, and MSP management. Backend API, frontend UI, admin dashboard, and production infrastructure are complete — deployed on DigitalOcean Kubernetes with managed databases, full test coverage, CI/CD pipeline, and operational tooling.

## Core Value

Provide reliable, scalable DNS security filtering that blocks threats in real-time — backed by an ops dashboard for MSP management.

## Current State

**v1.3 SHIPPED** — 2026-02-22

Platform is production-ready on DigitalOcean Kubernetes:
- Terraform-provisioned DOKS cluster (3-10 nodes), managed PostgreSQL with PgBouncer, managed Valkey with TLS, ClickHouse Cloud
- Full DNS resolution stack: dnsdist dual LoadBalancers → Policy Service → Unbound StatefulSet
- API + UI + Admin UI deployed with Helm, runtime env vars, TLS via cert-manager, DNS via external-dns
- Comprehensive test suite: API unit/integration/E2E, 264 Playwright UI specs, policy-svc Go tests, k6 load tests
- CI/CD pipeline: 6-service parallel builds, test gates, DOCR, staging auto-deploy, production manual approval
- SLO monitoring: Prometheus burn rate alerting (99.9% availability), Grafana dashboards, Blackbox Exporter synthetic monitoring
- Operational readiness: health probes, graceful shutdown, HPA with custom DNS metrics, backup verification, incident runbooks

**Tech Stack:**
- NestJS API with TypeORM/PostgreSQL
- Next.js 15 UI with App Router
- Go Policy Service (dnsdist → policy-svc → Unbound)
- ClickHouse for DNS query analytics
- Terraform for infrastructure provisioning
- Helm for Kubernetes deployments
- GitHub Actions CI/CD

See [MILESTONES.md](MILESTONES.md) for full milestone history.

## Requirements

### Validated

#### v1 Backend (shipped 2026-01-18)
- ✓ Tenant impersonation API — search, start/end sessions with audit logging
- ✓ MSP/Client visibility API — list MSPs, drill into clients, usage metrics
- ✓ MSP onboarding API — create accounts with initial configuration
- ✓ Billing operations API — subscriptions, credits, tier changes, trial extensions
- ✓ System health API — DNS status, error rates, metrics

#### v1.1 Frontend (shipped 2026-01-19)
- ✓ Admin auth UI — login page, session management, logout (AUTH-01 to AUTH-04)
- ✓ MSP onboarding wizard — multi-step form with validation (ONBOARD-01 to ONBOARD-06)
- ✓ MSP listing page — table with search, infinite scroll, client counts (LIST-01 to LIST-05)
- ✓ MSP detail/drill-down — client list, usage charts, actions (DETAIL-01 to DETAIL-05)
- ✓ Tenant search & impersonation — search bar, impersonate button, session indicator (IMP-01 to IMP-05)
- ✓ Billing portal — subscription status, invoices, credits, tier changes (BILL-01 to BILL-06)
- ✓ Payment method management — add/update cards, Stripe Elements (PAY-01 to PAY-06)
- ✓ System health dashboard — service status, error rates, metrics charts (HEALTH-01 to HEALTH-04)

#### v1.2 (shipped 2026-02-03)
- ✓ Role-based admin access — Super Admin, Admin, Viewer permission levels
- ✓ Automated alerting — Slack + PagerDuty for system health, billing, security
- ✓ Admin user management — CRUD, invites, activity logs, MFA management

#### v1.3 Production Readiness (shipped 2026-02-22)
- ✓ DOKS cluster provisioned with 3+ nodes, managed PostgreSQL/Valkey/ClickHouse Cloud — DEPLOY-01 to DEPLOY-04
- ✓ Full DNS stack deployed (dnsdist, Policy Service, Unbound) with managed service connections — DEPLOY-05 to DEPLOY-08
- ✓ UI/Admin UI with runtime env vars, TLS certificates, DNS automation — DEPLOY-09 to DEPLOY-13
- ✓ Comprehensive test suite: API unit/integration/E2E, Playwright UI, policy-svc Go tests — TEST-01 to TEST-08
- ✓ CI/CD pipeline with test gates, 6-service builds, staging/production deploy — OPS-03
- ✓ SLO monitoring, alerting, synthetic probes, Grafana dashboards — OPS-05 to OPS-07
- ✓ Health probes, graceful shutdown, HPA, backup verification, runbooks — OPS-01, OPS-02, OPS-04, OPS-08 to OPS-10

### Active

(No active requirements — define next milestone with `/gsd:new-milestone`)

### Future (v2+)

- Custom role builder — define granular permissions per role
- Additional alerting channels — Email, MS Teams, webhooks
- SSO for admin portal — integrate with corporate identity providers
- Multi-region deployment with GeoDNS routing
- Canary deployment strategy with traffic splitting by tenant_id
- Chaos engineering — DNS failure injection, latency simulation
- Visual regression testing for admin UI
- Contract testing with Pact for API consumers
- Distributed tracing with OpenTelemetry
- Automated secrets rotation via External Secrets Operator + Vault
- Cost monitoring per tenant (infrastructure attribution)
- ML-based anomaly detection for DNS query patterns

### Out of Scope

- Customer-facing admin features — this is internal ops only
- Per-MSP alerting rules — alerting is for ops team, not per-tenant configuration
- Real-time chat/collaboration — ops team uses existing tools (Slack)
- Multi-cloud deployment — DigitalOcean sufficient for initial scale
- Self-hosted monitoring stack — use managed services to reduce ops burden
- Zero-downtime database migrations — brief maintenance windows acceptable at current scale
- Machine learning anomaly detection — insufficient data at current scale, need 6+ months

## Context

**Technical environment:**
- NestJS API with TypeORM/PostgreSQL
- Next.js UI with App Router
- Go Policy Service (dnsdist → policy-svc → Unbound)
- ClickHouse for DNS query analytics
- Terraform for DigitalOcean infrastructure
- Helm for Kubernetes deployments
- GitHub Actions CI/CD pipeline

**Current state:**
- v1-v1.3 complete: 126 requirements shipped across 34 phases
- Full admin dashboard with RBAC, alerting, MSP management
- Production infrastructure provisioned on DigitalOcean
- Comprehensive test coverage (API, UI, policy-svc, load testing)
- CI/CD pipeline with staging auto-deploy and production manual approval
- SLO monitoring with Prometheus alerting and Grafana dashboards

## Constraints

- **Security**: Impersonation must be audit-logged with who, when, which tenant
- **Existing patterns**: Follow NestJS module structure in `api/src/modules/`
- **Auth**: Admin endpoints need separate auth guard (not tenant-scoped JWT)
- **Cloud**: DigitalOcean — DOKS for Kubernetes, managed databases, ClickHouse Cloud separate
- **Scale**: 100K-999K DNS queries/day, 1-10 tenants initially
- **Budget**: Cost-effective — DigitalOcean chosen for predictable pricing at moderate scale

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full impersonation over view-only | Ops needs to actually fix issues, not just see them | ✓ v1 |
| Backend-first approach | UI exists, API is the blocker | ✓ v1 |
| Separate admin JWT | Security isolation from tenant tokens | ✓ v1 |
| Follow tenant dashboard patterns | Consistency, faster development, familiar UX | ✓ v1.1 |
| Full onboarding wizard | Multi-step better for complex MSP setup | ✓ v1.1 |
| Stripe SetupIntent flow | PCI compliance, SCA support for Europe | ✓ v1.1 |
| Amber impersonation banner | High visibility, no dismiss option for safety | ✓ v1.1 |
| DigitalOcean over AWS/GCP | Simpler, predictable pricing, sufficient for initial scale | ✓ v1.3 |
| ClickHouse Cloud over self-hosted | Managed analytics avoids operational burden on small team | ✓ v1.3 |
| Managed Valkey over Redis | DO discontinued Redis (EOL June 2025), Valkey is compatible successor | ✓ v1.3 |
| Terraform for infrastructure | Reproducible provisioning, modular structure, remote state | ✓ v1.3 |
| Runtime env vars over NEXT_PUBLIC_ | Single Docker image works across staging and production | ✓ v1.3 |
| DNS-01 ACME challenge | Enables wildcard certificates for *.nebuladns.io | ✓ v1.3 |
| Multi-window burn rate alerting | Google SRE pattern reduces false positives for SLO monitoring | ✓ v1.3 |
| 6 parallel CI/CD builds | Reduces build phase from ~12min to ~2min | ✓ v1.3 |

---
*Last updated: 2026-02-22 after v1.3 milestone*
