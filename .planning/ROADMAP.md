# Roadmap: Nebula DNS Mission Control

## Milestones

- [x] **v1.0 Backend API** - Phases 1-8 (shipped 2026-01-18)
- [ ] **v1.1 Frontend Integration** - Phases 9-16 (in progress)

## Overview

This roadmap delivers the Mission Control frontend, enabling ops team to manage MSPs entirely through the UI. Starting with admin authentication (the gateway to all features), then backend payment method endpoints, followed by MSP management flows, billing portal, and finally the onboarding wizard.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3...): Planned milestone work
- Decimal phases (9.1, 9.2...): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 Backend API (Phases 1-8) - SHIPPED 2026-01-18</summary>

### Phase 1: Admin Auth Foundation
**Goal**: Secure admin authentication separate from tenant auth
**Plans**: 2 plans (complete)

### Phase 2: Tenant Search
**Goal**: Find any tenant by name, email, or ID
**Plans**: 1 plan (complete)

### Phase 3: Impersonation Core
**Goal**: Admin can act as any tenant with full audit trail
**Plans**: 2 plans (complete)

### Phase 4: MSP Listing
**Goal**: View and search all MSP accounts
**Plans**: 2 plans (complete)

### Phase 5: MSP Drill-Down
**Goal**: Deep visibility into MSP clients and usage
**Plans**: 2 plans (complete)

### Phase 6: System Health
**Goal**: Monitor DNS infrastructure status
**Plans**: 2 plans (complete)

### Phase 7: MSP Onboarding
**Goal**: Create new MSP accounts with initial configuration
**Plans**: 2 plans (complete)

### Phase 8: Billing Operations
**Goal**: Full billing control for tenant accounts
**Plans**: 3 plans (complete)

</details>

## v1.1 Frontend Integration (In Progress)

**Milestone Goal:** Complete frontend integration so ops team can use Mission Control end-to-end without CLI or direct API calls.

- [x] **Phase 9: Admin Auth UI** - Login page, session management, protected routes
- [x] **Phase 10: Payment Methods Backend** - New API endpoints for payment method management
- [x] **Phase 11: MSP Listing UI** - Paginated MSP table with search and navigation
- [x] **Phase 12: MSP Detail UI** - Client list, usage metrics, action buttons
- [x] **Phase 13: Tenant Search & Impersonation UI** - Search bar, impersonation flow, session indicator
- [ ] **Phase 14: Billing Portal UI** - Subscription status, invoices, credits, payment methods
- [ ] **Phase 15: System Health UI** - Service status cards, error rates, metrics charts
- [ ] **Phase 16: MSP Onboarding Wizard** - Multi-step form with validation and confirmation

## Phase Details

### Phase 9: Admin Auth UI
**Goal**: Admin can securely access Mission Control through the UI
**Depends on**: Phase 8 (v1 complete)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Admin can enter email/password on login page and access dashboard
  2. Admin sees their session status (logged in user) in the header
  3. Admin can click logout and is returned to login page
  4. Admin is automatically redirected to login when session expires or on protected routes
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Auth context and admin login page
- [x] 09-02-PLAN.md — Session UI, logout, and route protection

### Phase 10: Payment Methods Backend
**Goal**: API endpoints exist for managing tenant payment methods
**Depends on**: Phase 9
**Requirements**: PAY-01, PAY-02, PAY-03
**Success Criteria** (what must be TRUE):
  1. Admin can call GET endpoint to list tenant's payment methods
  2. Admin can call POST endpoint to add payment method via Stripe
  3. Admin can call PATCH endpoint to set default payment method
**Plans**: 1 plan

Plans:
- [x] 10-01-PLAN.md — Payment method Stripe integration and admin endpoints

### Phase 11: MSP Listing UI
**Goal**: Admin can browse and search all MSP accounts
**Depends on**: Phase 9
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05
**Success Criteria** (what must be TRUE):
  1. Admin sees paginated table of MSPs with client count and status columns
  2. Admin can type in search box and see filtered MSP results
  3. Admin can click any MSP row to navigate to its detail page
  4. Infinite scroll loads more results when scrolling to bottom
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — Admin API hooks and MSP listing page foundation
- [x] 11-02-PLAN.md — Infinite scroll, row actions, and navigation integration

### Phase 12: MSP Detail UI
**Goal**: Admin can view MSP details and drill into clients
**Depends on**: Phase 11
**Requirements**: DETAIL-01, DETAIL-02, DETAIL-03, DETAIL-04, DETAIL-05
**Success Criteria** (what must be TRUE):
  1. Admin sees MSP overview (name, tier, status, created date) on detail page
  2. Admin sees list of MSP's clients with basic info
  3. Admin sees usage charts (queries over time, blocked percentage)
  4. Admin can click buttons to navigate to billing or start impersonation
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md — MSP detail hooks and page foundation with stat cards and actions
- [x] 12-02-PLAN.md — Client list table and usage charts with period toggle

### Phase 13: Tenant Search & Impersonation UI
**Goal**: Admin can find any tenant and impersonate them
**Depends on**: Phase 9
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05
**Success Criteria** (what must be TRUE):
  1. Admin can search for tenants by name, email, or ID and see results
  2. Admin can click "Impersonate" on a search result to start session
  3. Admin sees clear visual indicator (banner/badge) when in impersonation mode
  4. Admin can click "End Impersonation" to return to admin context
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md — Search hook, dropdown component, and header integration
- [x] 13-02-PLAN.md — Impersonation banner and session management

### Phase 14: Billing Portal UI
**Goal**: Admin can manage all billing aspects for tenants
**Depends on**: Phase 10, Phase 12
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06, PAY-04, PAY-05, PAY-06
**Success Criteria** (what must be TRUE):
  1. Admin sees subscription status with current tier and dates
  2. Admin can view invoice history and download invoice PDFs
  3. Admin can apply credits, change tier, extend trial, and extend grace period
  4. Admin can view, add, and set default payment methods for tenant
**Plans**: 3 plans

Plans:
- [ ] 14-01-PLAN.md — Billing hooks and page foundation with subscription status cards
- [ ] 14-02-PLAN.md — Invoice history table and billing action modals
- [ ] 14-03-PLAN.md — Payment methods management with Stripe Elements

### Phase 15: System Health UI
**Goal**: Admin can monitor DNS infrastructure health
**Depends on**: Phase 9
**Requirements**: HEALTH-01, HEALTH-02, HEALTH-03, HEALTH-04
**Success Criteria** (what must be TRUE):
  1. Admin sees service status cards showing up/down/degraded for each DNS component
  2. Admin sees error rate metrics and recent error list
  3. Admin sees aggregate query volume charts
  4. Dashboard data refreshes automatically on interval
**Plans**: TBD

Plans:
- [ ] 15-01: TBD
- [ ] 15-02: TBD

### Phase 16: MSP Onboarding Wizard
**Goal**: Admin can onboard new MSPs through guided wizard
**Depends on**: Phase 11
**Requirements**: ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06
**Success Criteria** (what must be TRUE):
  1. Admin can access onboarding wizard from MSP listing or dashboard
  2. Wizard guides through 4 steps: company info, admin user, settings, review
  3. Each step validates input before allowing progression
  4. Admin sees confirmation with MSP details after successful creation
**Plans**: TBD

Plans:
- [ ] 16-01: TBD
- [ ] 16-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Admin Auth Foundation | v1.0 | 2/2 | Complete | 2026-01-17 |
| 2. Tenant Search | v1.0 | 1/1 | Complete | 2026-01-17 |
| 3. Impersonation Core | v1.0 | 2/2 | Complete | 2026-01-17 |
| 4. MSP Listing | v1.0 | 2/2 | Complete | 2026-01-17 |
| 5. MSP Drill-Down | v1.0 | 2/2 | Complete | 2026-01-18 |
| 6. System Health | v1.0 | 2/2 | Complete | 2026-01-18 |
| 7. MSP Onboarding | v1.0 | 2/2 | Complete | 2026-01-18 |
| 8. Billing Operations | v1.0 | 3/3 | Complete | 2026-01-18 |
| 9. Admin Auth UI | v1.1 | 2/2 | Complete | 2026-01-18 |
| 10. Payment Methods Backend | v1.1 | 1/1 | Complete | 2026-01-18 |
| 11. MSP Listing UI | v1.1 | 2/2 | Complete | 2026-01-18 |
| 12. MSP Detail UI | v1.1 | 2/2 | Complete | 2026-01-19 |
| 13. Tenant Search & Impersonation UI | v1.1 | 2/2 | Complete | 2026-01-19 |
| 14. Billing Portal UI | v1.1 | 0/3 | Not started | - |
| 15. System Health UI | v1.1 | 0/2 | Not started | - |
| 16. MSP Onboarding Wizard | v1.1 | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-18*
*v1.1 phases: 9-16 (8 phases, 35 requirements)*
