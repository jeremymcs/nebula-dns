# Nebula DNS Admin Dashboard

## What This Is

An internal operations dashboard for the Nebula DNS team to manage MSP accounts and their clients. The UI (mission-control) already exists but lacks backend API endpoints. This milestone completes the admin dashboard by building the required API layer.

## Core Value

Enable the ops team to handle support escalations quickly through tenant impersonation — reducing time-to-resolution for MSP customer issues.

## Requirements

### Validated

- ✓ Multi-tenant DNS security platform with policy management — existing
- ✓ MSP tier with client organization support — existing
- ✓ Authentication system (JWT, MFA, SSO) — existing
- ✓ Billing/Stripe integration for subscriptions — existing
- ✓ Reports and analytics via ClickHouse — existing
- ✓ Mission Control UI scaffolding — existing (needs backend)

### Active

- [ ] Tenant impersonation — ops can access any tenant as admin to troubleshoot
- [ ] MSP/Client visibility — list all MSPs, drill into clients, view usage/status
- [ ] MSP onboarding — create new MSP accounts with initial configuration
- [ ] Billing operations — view/adjust subscriptions, apply credits, see invoices
- [ ] System health monitoring — DNS service status, error rates, alerts

### Out of Scope

- Role-based admin access — single shared access for small team (2-5), revisit if team grows
- Customer-facing admin features — this is internal ops only
- Automated alerting/PagerDuty — manual monitoring sufficient for now

## Context

**Technical environment:**
- NestJS API with TypeORM/PostgreSQL
- Next.js UI with App Router
- Mission Control UI exists at `ui/src/app/mission-control/`
- MSP modules exist: `api/src/modules/msp/`, `api/src/modules/msp-billing/`, `api/src/modules/msp-clients/`
- Audit logging already captures actions for compliance

**Current state:**
- UI pages built but API endpoints missing
- Small ops team (2-5 people) will use this
- Support tickets currently require direct database access to troubleshoot

**Priority order:**
1. Tenant impersonation (unblocks support escalations)
2. MSP/Client visibility (see what's happening)
3. System health (know when things break)
4. MSP onboarding (reduce manual setup)
5. Billing operations (handle billing issues)

## Constraints

- **Security**: Impersonation must be audit-logged with who, when, which tenant
- **Existing patterns**: Follow NestJS module structure in `api/src/modules/`
- **Auth**: Admin endpoints need separate auth guard (not tenant-scoped JWT)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full impersonation over view-only | Ops needs to actually fix issues, not just see them | — Pending |
| No role separation initially | Small team, complexity not justified yet | — Pending |
| Backend-first approach | UI exists, API is the blocker | — Pending |

---
*Last updated: 2026-01-17 after initialization*
