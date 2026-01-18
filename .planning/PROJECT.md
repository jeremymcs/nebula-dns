# Nebula DNS Admin Dashboard

## What This Is

An internal operations dashboard for the Nebula DNS team to manage MSP accounts and their clients. The UI (mission-control) already exists but lacks backend API endpoints. This milestone completes the admin dashboard by building the required API layer.

## Core Value

Enable the ops team to handle support escalations quickly through tenant impersonation — reducing time-to-resolution for MSP customer issues.

## Current State

**v1 SHIPPED** — 2026-01-18

The admin dashboard backend API is complete with:
- Secure admin authentication (separate from tenant auth)
- Full tenant impersonation with audit logging
- MSP visibility and drill-down
- System health monitoring
- MSP onboarding workflow
- Billing operations

See [MILESTONES.md](MILESTONES.md) for details.

## Requirements

### Shipped (v1)

- ✓ Tenant impersonation — ops can access any tenant as admin to troubleshoot
- ✓ MSP/Client visibility — list all MSPs, drill into clients, view usage/status
- ✓ MSP onboarding — create new MSP accounts with initial configuration
- ✓ Billing operations — view/adjust subscriptions, apply credits, see invoices
- ✓ System health monitoring — DNS service status, error rates, alerts

### Future (v2)

- Role-based admin access — different permission levels for ops team
- Automated alerting — PagerDuty/Slack integration
- Admin user management — add/remove admins

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
- Admin module: `api/src/modules/admin/`
- Audit logging already captures actions for compliance

**Current state:**
- v1 complete with 23 requirements, 19 API endpoints
- Small ops team (2-5 people) will use this
- Support escalations can now be handled through the dashboard

## Constraints

- **Security**: Impersonation must be audit-logged with who, when, which tenant
- **Existing patterns**: Follow NestJS module structure in `api/src/modules/`
- **Auth**: Admin endpoints need separate auth guard (not tenant-scoped JWT)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full impersonation over view-only | Ops needs to actually fix issues, not just see them | ✓ Implemented |
| No role separation initially | Small team, complexity not justified yet | ✓ Deferred to v2 |
| Backend-first approach | UI exists, API is the blocker | ✓ Complete |
| Separate admin JWT | Security isolation from tenant tokens | ✓ Implemented |

---
*Last updated: 2026-01-18 after v1 milestone shipped*
