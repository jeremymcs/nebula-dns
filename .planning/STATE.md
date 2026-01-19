# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-18)

**Core value:** Enable ops team to manage MSPs entirely through the UI — onboarding, billing, usage monitoring — without CLI or direct API calls.
**Current focus:** Phase 15 (System Health UI)

## Current Position

Phase: 15 of 16 (System Health UI) - IN PROGRESS
Plan: 1 of 2 in phase - COMPLETE
Status: In progress
Last activity: 2026-01-19 - Completed 15-01-PLAN.md (hooks and service status cards)

Progress: [###################-] 94% (v1 complete, v1.1 plan 13 of 16)

## Performance Metrics

**Velocity (v1):**
- Total plans completed: 17
- Average duration: 4.5 min
- Total execution time: 78 min

**By Phase (v1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-admin-auth-foundation | 2/2 | 8 min | 4 min |
| 02-tenant-search | 1/1 | 6 min | 6 min |
| 03-impersonation-core | 2/2 | 10 min | 5 min |
| 04-msp-listing | 2/2 | 7 min | 3.5 min |
| 05-msp-drill-down | 2/2 | 6 min | 3 min |
| 06-system-health | 2/2 | 11 min | 5.5 min |
| 07-msp-onboarding | 2/2 | 11 min | 5.5 min |
| 08-billing-operations | 3/3 | 14 min | 4.7 min |

**v1.1 Phases:**

| Phase | Plans | Status |
|-------|-------|--------|
| 09-admin-auth-ui | 2/2 | Complete |
| 10-payment-methods-backend | 1/1 | Complete |
| 11-msp-listing-ui | 2/2 | Complete |
| 12-msp-detail-ui | 2/2 | Complete |
| 13-tenant-search-impersonation-ui | 2/2 | Complete |
| 14-billing-portal-ui | 3/3 | Complete |
| 15-system-health-ui | 1/2 | In progress |
| 16-msp-onboarding-wizard | 0/2 | Not started |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1]: Separate admin JWT secret from tenant JWT secret
- [v1]: 8-hour token expiry for admin workday sessions
- [v1]: Impersonation tokens use 1-hour expiry
- [v1.1 Roadmap]: Auth UI first as foundation for all other features
- [v1.1 Roadmap]: Payment methods backend (Phase 10) before billing portal UI (Phase 14)
- [v1.1 Roadmap]: MSP Onboarding Wizard last (Phase 16) to build with full context
- [09-01]: No "Remember me" checkbox on admin login (security best practice)
- [09-01]: Use separate localStorage keys (admin_token, admin_user, admin_session_expiry)
- [09-01]: No token refresh for 8-hour admin tokens
- [09-02]: Direct logout without confirmation dialog
- [09-02]: "Stay Logged In" opens login in new tab to preserve work state
- [09-02]: 30-second interval for session expiry checks
- [10-01]: Use SetupIntent flow for adding payment methods (Stripe recommended for SCA compliance)
- [10-01]: Auto-create Stripe customer if tenant has no stripeCustomerId during SetupIntent creation
- [10-01]: Include DELETE endpoint with protection (cannot delete default or only payment method)
- [10-01]: Cards only for Phase 10 (bank accounts can be added later)
- [11-01]: Separate useAdminApi.ts file for admin hooks (cleaner separation from tenant useApi.ts)
- [11-01]: Admin pages use admin_token localStorage key for authentication
- [11-02]: IntersectionObserver with sentinel element for infinite scroll (efficient, no scroll listeners)
- [11-02]: URL state sync with router.replace for bookmarkable filter state
- [11-02]: Navigation links visible on md+ screens with active state highlighting
- [12-01]: Direct impersonation without confirmation dialog (per CONTEXT.md)
- [12-01]: Impersonation storage: impersonation_token, impersonation_info JSON, overwrite token
- [12-01]: View Billing placeholder toast until Phase 14
- [12-02]: Period toggle affects both MSP detail fetch and client list fetch
- [12-02]: Mock chart data generated from aggregate usage metrics
- [13-01]: 300ms debounce delay for search input (balances responsiveness with API load)
- [13-01]: Minimum 2 characters required before tenant search triggers
- [13-01]: Full page reload on impersonation (window.location.href) to reset app state
- [13-02]: Amber banner (bg-amber-500) for high visibility during impersonation
- [13-02]: Eye icon for 'viewing as' semantic (instead of arrows)
- [13-02]: No dismiss option on impersonation banner (per CONTEXT.md)
- [14-01]: Separate useAdminBilling.ts file for billing-specific hooks
- [14-01]: Billing page uses /tenants/[id]/billing route for both MSPs and clients
- [14-01]: Alert banners: red for canceled/paused, amber for past_due/grace period
- [14-01]: Credit balance shown as stat card with inline Add button
- [14-02]: Blob fetch pattern for PDF download (requires auth header, cannot use window.open)
- [14-02]: Two-step confirmation for credit application (prevents accidental submissions)
- [14-02]: Hardcoded tier features in ChangeTierModal (can be made dynamic later)
- [14-02]: Extend buttons conditionally shown: trial only if active, grace only if exists
- [14-03]: Use stripePromise lazy-loading from NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- [14-03]: Card brand colors: Visa=blue, Mastercard=orange, Amex=blue
- [14-03]: SetupIntent flow for secure Stripe Elements card collection
- [15-01]: 30-second auto-refresh interval with pause toggle for system health
- [15-01]: Combine services array and storage object into unified card grid
- [15-01]: Show quick stats row below service cards for at-a-glance metrics

### Pending Todos

None.

### Blockers/Concerns

None.

## v1 Complete Summary

All 8 phases of v1 backend API complete:
- Admin Auth Foundation: 2 plans
- Tenant Search: 1 plan
- Impersonation Core: 2 plans
- MSP Listing: 2 plans
- MSP Drill-Down: 2 plans
- System Health: 2 plans
- MSP Onboarding: 2 plans
- Billing Operations: 3 plans

**Total:** 17 plans, 23 requirements, 19 API endpoints

## v1.1 Progress Summary

Phase 09-admin-auth-ui complete:
- Admin API helpers and auth context
- Admin login page with split-screen design
- Admin header with session indicator and logout
- Session expiry warning modal (5 minutes before)
- Protected route handling for Mission Control

Phase 10-payment-methods-backend complete:
- Five new PaymentsService methods for Stripe PaymentMethod operations
- Four new AdminBillingService methods with audit logging
- Four new API endpoints under /admin/tenants/:tenantId/billing/payment-methods/*
- Protection logic for default/only payment method deletion

Phase 11-msp-listing-ui complete:
- Admin-specific SWR hooks with adminFetcher using admin_token
- useAdminMspList hook with search/status/pagination parameters
- MSP listing page at /mission-control/msps with search, filter, table
- Infinite scroll with IntersectionObserver and cursor-based pagination
- URL state for bookmarkable search/filter
- Row actions with View Details and Impersonate options
- Header navigation with Dashboard and MSPs links

Phase 12-msp-detail-ui complete:
- useAdminMspDetail hook for fetching MSP detail with period param
- startImpersonation function for initiating impersonation sessions
- useAdminMspClients hook for fetching MSP's client list
- MSP detail page at /mission-control/msps/[id] with stat cards
- Client list table with search, filter, action menus
- Query Volume and Blocked vs Allowed usage charts
- Period toggle (24h/7d/30d) affecting charts and client queries
- View Billing and Impersonate action buttons

Phase 13-tenant-search-impersonation-ui complete:
- useDebounce generic hook for debouncing values
- useAdminTenantSearch SWR hook for tenant search API
- TenantSearchDropdown spotlight-style search component
- Search integrated into AdminHeader on desktop
- Impersonation storage helpers (store, get, clear, isImpersonating)
- useImpersonation React hook for session state
- ImpersonationBanner component with tenant name and tier
- Banner integrated into DashboardLayout

Phase 14-billing-portal-ui complete:
- useAdminBilling.ts with SWR hooks for billing endpoints
- Billing page at /mission-control/tenants/[id]/billing
- Subscription status stat cards (tier, status, cycle, credits)
- Alert banners for critical billing states
- Invoice history table with expandable rows
- Billing action modals (tier change, credits, extensions)
- Stripe Elements integration for payment methods
- PaymentMethodList with card tiles and action menus
- AddPaymentMethodModal with SetupIntent flow

Phase 15-system-health-ui in progress (1/2):
- useAdminSystemHealth hook with auto-refresh support
- useAdminRecentErrors hook with configurable limit
- System Health page at /mission-control/health
- 5 service status cards with traffic light indicators
- Quick stats row for query volumes and error rates
- Pause/Resume auto-refresh toggle
- Health navigation link in AdminHeader

**Total:** 13 plans complete

## Session Continuity

Last session: 2026-01-19
Stopped at: Completed 15-01-PLAN.md
Resume file: None

Next: Execute 15-02-PLAN.md (Error Log and Query Charts)
