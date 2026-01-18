# Nebula DNS Admin Dashboard

## What This Is

An internal operations dashboard for the Nebula DNS team to manage MSP accounts and their clients. The backend API (v1) is complete. This milestone completes the frontend integration so ops can use the dashboard end-to-end.

## Core Value

Enable the ops team to manage MSPs entirely through the UI — onboarding, billing, usage monitoring — without CLI or direct API calls.

## Current Milestone: v1.1 — Mission Control Frontend

**Goal:** Complete frontend integration with v1 API so ops team has a fully usable dashboard.

**Target features:**
- Full MSP onboarding wizard (company info → admin user → initial config → confirmation)
- Complete billing portal (subscriptions, invoices, credits, tier changes, payment methods)
- MSP listing and drill-down UI with usage metrics
- Tenant search and impersonation flow
- System health dashboard
- Admin authentication UI (login, session management)

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

### Shipped (v1 Backend)

- ✓ Tenant impersonation API — search, start/end sessions with audit logging
- ✓ MSP/Client visibility API — list MSPs, drill into clients, usage metrics
- ✓ MSP onboarding API — create accounts with initial configuration
- ✓ Billing operations API — subscriptions, credits, tier changes, trial extensions
- ✓ System health API — DNS status, error rates, metrics

### Active (v1.1 Frontend)

- [ ] Admin auth UI — login page, session management, logout
- [ ] MSP onboarding wizard — multi-step form with validation
- [ ] MSP listing page — table with search, pagination, client counts
- [ ] MSP detail/drill-down — client list, usage charts, actions
- [ ] Tenant search & impersonation — search bar, impersonate button, session indicator
- [ ] Billing portal — subscription status, invoices, credits, tier changes
- [ ] Payment method management — add/update cards (NEW backend endpoints needed)
- [ ] System health dashboard — service status, error rates, metrics charts

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
- Mission Control UI (partial) at `ui/src/app/mission-control/`
- Admin API module: `api/src/modules/admin/`
- MSP modules: `api/src/modules/msp/`, `api/src/modules/msp-billing/`, `api/src/modules/msp-clients/`
- Audit logging already captures actions for compliance

**Current state:**
- v1 backend complete: 23 requirements, 19 API endpoints
- Mission Control UI has partial pages needing completion + API wiring
- Small ops team (2-5 people) will use this
- Primary workflow: MSP management (onboard → billing → usage monitoring)

**UI patterns:**
- Follow existing tenant dashboard conventions
- Match component patterns from `ui/src/components/dashboard/`

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
| Follow tenant dashboard patterns | Consistency, faster development, familiar UX | — Pending |
| Full onboarding wizard | Multi-step better for complex MSP setup | — Pending |
| Build payment method endpoints | Full billing control needed in admin dashboard | — Pending |

---
*Last updated: 2026-01-18 after v1.1 milestone started*
