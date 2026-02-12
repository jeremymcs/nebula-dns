# Nebula DNS

## What This Is

A multi-tenant DNS security and content filtering SaaS platform with an internal operations dashboard (Mission Control). The platform blocks malware, phishing, and undesirable content at the DNS level while providing granular policy control, comprehensive analytics, and MSP management. Backend API, frontend UI, and admin dashboard are complete — now preparing for production deployment.

## Core Value

Provide reliable, scalable DNS security filtering that blocks threats in real-time — backed by an ops dashboard for MSP management.

## Current Milestone: v1.3 Production Readiness

**Goal:** Get the platform tested, deployed on DigitalOcean, and handling real DNS traffic.

**Target features:**
- Full-stack automated test suite verifying all platform features
- DigitalOcean deployment (DOKS, Managed PostgreSQL, Managed Redis, ClickHouse Cloud)
- Production DNS resolution stack (dnsdist + Policy Service + Unbound) handling 100K-999K queries/day

## Current State

**v1.2 SHIPPED** — 2026-02-03

Mission Control now includes role-based access control, admin user management, and alerting integrations:
- Three-tier RBAC (Super Admin, Admin, Viewer) with proper route protection
- Admin user management with email invitations, activity logs, suspend/reactivate
- Slack and PagerDuty alerting for system health, billing, and security events
- Safe rollout infrastructure with feature flags, shadow mode, and monitoring

**v1.1 SHIPPED** — 2026-01-19

Mission Control is fully operational with:
- Secure admin authentication and session management
- MSP listing with infinite scroll, search, and drill-down
- Tenant search and impersonation with amber banner indicator
- Complete billing portal (subscriptions, invoices, credits, payment methods)
- System health monitoring with auto-refresh
- 4-step MSP onboarding wizard

**Tech Stack:**
- Next.js 15 with App Router
- Recharts for usage visualizations
- Stripe Elements for payment methods
- SWR for data fetching with 30s auto-refresh

See [MILESTONES.md](MILESTONES.md) for v1 (backend) and v1.1 (frontend) details.

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

### Active

- [ ] Full-stack automated test suite (API, UI E2E, Policy Service)
- [ ] DigitalOcean Kubernetes deployment (DOKS)
- [ ] Managed database services (PostgreSQL, Redis, ClickHouse Cloud)
- [ ] Production DNS resolution stack deployed and handling traffic

### Future (v2+)

- CI/CD pipeline — automated deployment on push
- Monitoring & observability — Prometheus, Grafana dashboards
- Backup & disaster recovery — automated PostgreSQL/ClickHouse backups
- Security hardening — TLS everywhere, network policies, secrets management
- Custom role builder — define granular permissions per role
- Additional alerting channels — Email, MS Teams, webhooks
- SSO for admin portal — integrate with corporate identity providers

### Out of Scope

- Customer-facing admin features — this is internal ops only
- Per-MSP alerting rules — alerting is for ops team, not per-tenant configuration
- Real-time chat/collaboration — ops team uses existing tools (Slack)

## Context

**Technical environment:**
- NestJS API with TypeORM/PostgreSQL
- Next.js UI with App Router
- Mission Control UI (partial) at `ui/src/app/mission-control/`
- Admin API module: `api/src/modules/admin/`
- MSP modules: `api/src/modules/msp/`, `api/src/modules/msp-billing/`, `api/src/modules/msp-clients/`
- Audit logging already captures actions for compliance

**Current state:**
- v1-v1.2 complete: 95 requirements shipped across 23 phases
- Full admin dashboard with RBAC, alerting, MSP management
- DNS data plane: dnsdist → Policy Service (Go) → Unbound
- Analytics: ClickHouse for DNS query logging
- Running in Docker Compose locally, not yet deployed to cloud
- Next: Testing, DigitalOcean deployment, production traffic

**UI patterns:**
- Follow existing tenant dashboard conventions
- Match component patterns from `ui/src/components/dashboard/`

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
| No role separation initially | Small team, complexity not justified yet | ✓ Deferred to v2 |
| Backend-first approach | UI exists, API is the blocker | ✓ v1 |
| Separate admin JWT | Security isolation from tenant tokens | ✓ v1 |
| Follow tenant dashboard patterns | Consistency, faster development, familiar UX | ✓ v1.1 |
| Full onboarding wizard | Multi-step better for complex MSP setup | ✓ v1.1 |
| Build payment method endpoints | Full billing control needed in admin dashboard | ✓ v1.1 |
| Stripe SetupIntent flow | PCI compliance, SCA support for Europe | ✓ v1.1 |
| Amber impersonation banner | High visibility, no dismiss option for safety | ✓ v1.1 |
| localStorage draft persistence | Resume interrupted MSP onboarding (24h expiry) | ✓ v1.1 |
| 30s auto-refresh on health dashboard | Real-time monitoring without WebSocket complexity | ✓ v1.1 |
| DigitalOcean over AWS/GCP | Simpler, predictable pricing, sufficient for initial scale | — Pending |
| ClickHouse Cloud over self-hosted | Managed analytics avoids operational burden on small team | — Pending |

---
*Last updated: 2026-02-11 after v1.3 milestone start*
