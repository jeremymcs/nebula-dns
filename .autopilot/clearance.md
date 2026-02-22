# Mission Clearance: Nebula DNS Admin Dashboard

// Project Autopilot - Mission Clearance
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

## Mission Objective

Build a fully-functional internal operations dashboard (Mission Control) for the Nebula DNS team to manage MSP accounts and their clients through a comprehensive web UI.

## Core Value Proposition

Enable the ops team to manage MSPs entirely through the UI — onboarding, billing, usage monitoring, role-based access, and alerting — without CLI or direct API calls.

## Project Status

**Current Version:** v1.2 (SHIPPED - 2026-02-03)

**Milestones Completed:**
- ✅ v1.0 — Backend API (8 phases, 23 requirements)
- ✅ v1.1 — Mission Control Frontend (8 phases, 35 requirements)
- ✅ v1.2 — Admin Roles & Alerting (7 phases, 37 requirements)

**Next Steps:** Ready for v1.3 or v2.0 milestone planning

## Technical Stack

**Control Plane:**
- Backend: NestJS + TypeORM + PostgreSQL
- Frontend: Next.js 15 with App Router
- UI Libraries: Recharts, Stripe Elements, SWR

**Data Plane:**
- DNS: dnsdist → Policy Service (Go) → Unbound
- Storage: PostgreSQL, Redis, ClickHouse

**Architecture:** Three-tier multi-tenant SaaS with tenant-scoped entities

## Key Features Delivered

### v1.2 (RBAC & Alerting)
- Three-tier RBAC system (Super Admin, Admin, Viewer)
- Admin user management with email invitations
- Slack and PagerDuty alerting integrations
- Feature flags for safe rollout
- Activity audit logging

### v1.1 (Mission Control UI)
- Admin authentication UI with session management
- MSP listing with infinite scroll and search
- MSP detail pages with client drill-down
- Tenant search and impersonation UI
- Complete billing portal with Stripe integration
- System health dashboard with auto-refresh
- 4-step MSP onboarding wizard

### v1.0 (Backend API)
- Secure admin authentication (separate from tenant auth)
- Tenant impersonation with audit logging
- MSP/Client visibility and metrics
- System health monitoring
- MSP onboarding workflow
- Billing operations API

## Requirements Summary

**Total Requirements Validated:** 95
- v1.0: 23/23 complete
- v1.1: 35/35 complete
- v1.2: 37/37 complete

## Project Constraints

**Security:**
- Impersonation must be audit-logged (who, when, which tenant)
- Admin endpoints use separate auth guard (not tenant-scoped JWT)
- Separate admin JWT strategy with distinct issuer claim

**Architecture:**
- Follow existing NestJS module structure in `api/src/modules/`
- Follow tenant dashboard UI patterns for consistency
- All entities scoped by `tenant_id` for multi-tenancy

**Performance:**
- O(1) policy evaluation using Redis-cached Tries
- ClickHouse for high-volume query analytics
- Fail-open DNS strategy (configurable)

## Key Design Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Full impersonation over view-only | Ops needs to fix issues, not just view | ✅ v1.0 |
| Separate admin JWT | Security isolation from tenant tokens | ✅ v1.0 |
| Backend-first approach | API was the blocker, UI exists | ✅ v1.0 |
| Follow tenant dashboard patterns | Consistency, faster development | ✅ v1.1 |
| Full onboarding wizard | Multi-step better for complex MSP setup | ✅ v1.1 |
| Stripe SetupIntent flow | PCI compliance, SCA support | ✅ v1.1 |
| Amber impersonation banner | High visibility, safety | ✅ v1.1 |
| localStorage draft persistence | Resume interrupted onboarding | ✅ v1.1 |
| Three-tier RBAC | Balance security with operational flexibility | ✅ v1.2 |
| Encrypted credentials storage | Protect Slack/PagerDuty API keys | ✅ v1.2 |
| Feature flags for RBAC | Safe gradual rollout | ✅ v1.2 |

## Future Scope (v2+)

**Under Consideration:**
- Custom role builder with granular permissions
- Additional alerting channels (Email, MS Teams, webhooks)
- SSO for admin portal
- Advanced usage analytics and forecasting
- Bulk operations for MSP management

**Out of Scope:**
- Customer-facing admin features (internal ops only)
- Per-MSP alerting rules (alerting is ops-team focused)
- Real-time chat/collaboration (use existing Slack)

## Success Metrics

**Development:**
- 23 phases completed across 3 milestones
- 64 execution plans
- 262 files modified
- ~67,456 LOC added

**Operational Impact:**
- Ops team (2-5 people) actively using dashboard
- Primary workflow: MSP onboarding → billing → monitoring
- Complete audit trail for compliance
- Role-based access reducing security risk

## Documentation

**Design Docs:** `/docs/`
- A-system-design.md: Architecture overview
- B-threat-model.md: Security analysis
- C-database-schema.md: Schema details
- D-api-spec.md: API specifications
- E-policy-evaluation-algorithm.md: O(1) algorithm
- F-dnsdist-routing-approach.md: Tenant extraction
- DATABASE-MIGRATIONS.md: Migration guide

**API Documentation:** Swagger UI at `http://localhost:4010/api/docs`

## Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| API | 4010 | NestJS backend |
| UI | 4011 | Next.js frontend |
| PostgreSQL | 4432 | Main database |
| Redis | 4379 | Cache/pub-sub |
| ClickHouse | 4123/4900 | Analytics |
| Policy Service | 4080 | DNS policy engine |
| Unbound | 5354 | DNS resolver |
| dnsdist DoT | 4853 | DNS over TLS |
| dnsdist DoH | 4443 | DNS over HTTPS |

---

*Converted from GSD format on 2026-02-03*
*Original: .planning/PROJECT.md*
