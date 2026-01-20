# Nebula DNS Admin Dashboard

## What This Is

A fully-functional internal operations dashboard (Mission Control) for the Nebula DNS team to manage MSP accounts and their clients through a comprehensive web UI. Both backend API and frontend are complete.

## Core Value

Enable the ops team to manage MSPs entirely through the UI — onboarding, billing, usage monitoring — without CLI or direct API calls.

## Current State

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

### Active

(Next milestone requirements TBD)

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

---
*Last updated: 2026-01-19 after v1.1 milestone shipped*
