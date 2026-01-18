---
phase: 08-billing-operations
plan: 02
subsystem: admin-billing
tags: [admin, billing, stripe, audit, endpoints]

dependency-graph:
  requires: ["08-01"]
  provides: ["billing-controller-endpoints", "billing-audit-types", "credit-tier-operations"]
  affects: ["08-03"]

tech-stack:
  added: []
  patterns:
    - "Admin billing controller pattern"
    - "Stripe credit balance operations"
    - "Tier change with proration handling"
    - "Comprehensive audit logging for billing mutations"

files:
  created: []
  modified:
    - api/src/modules/audit-logs/entities/audit-log.entity.ts
    - api/src/modules/admin/admin-billing.service.ts
    - api/src/modules/admin/admin-billing.service.spec.ts
    - api/src/modules/admin/admin.controller.ts
    - api/src/modules/admin/admin.controller.spec.ts
    - api/src/modules/admin/admin.module.ts

decisions:
  - id: BIL-02-01
    choice: "Warning threshold for large credits at $500"
    reason: "Balances fraud prevention with legitimate use cases"
  - id: BIL-02-02
    choice: "Tier price mapping from environment variables"
    reason: "Allows different Stripe price IDs per environment"
  - id: BIL-02-03
    choice: "URL structure /admin/tenants/:tenantId/billing/*"
    reason: "Consistent REST pattern, tenant-centric design"

metrics:
  duration: "15 minutes"
  completed: "2026-01-18"
---

# Phase 08 Plan 02: Billing Controller Endpoints Summary

Credit/tier operations with full audit logging and 7 admin billing endpoints.

## What Was Built

### Task 1: Billing Audit Types and Credit/Tier Methods

**AuditAction Type Extensions:**
- `billing_credit_applied` - Credit/adjustment applied to account
- `billing_tier_changed` - Subscription tier changed
- `billing_trial_extended` - Trial period extended
- `billing_grace_extended` - Grace period extended

**AdminBillingService Methods:**

```typescript
// Apply credit with warning threshold
async applyCredit(tenantId: string, dto: ApplyCreditDto, adminId: string): Promise<CreditAppliedResponseDto>
// Change tier with immediate or end-of-period timing
async changeTier(tenantId: string, dto: ChangeTierDto, adminId: string): Promise<TierChangeResponseDto>
```

Key implementation details:
- `CREDIT_WARNING_THRESHOLD` at $500 (50000 cents) - logs warning but allows
- `tierPriceMap` loaded from environment (STRIPE_PRICE_HOME_MONTHLY, etc.)
- Full audit logging with adminId, transactionId, previousTier, newTier

### Task 2: Billing Endpoints to AdminController

**7 Billing Endpoints Added:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/tenants/:tenantId/billing/subscription` | Get comprehensive subscription status |
| GET | `/admin/tenants/:tenantId/billing/invoices` | List paginated Stripe invoices |
| GET | `/admin/tenants/:tenantId/billing/invoices/:invoiceId/pdf` | Stream invoice PDF |
| POST | `/admin/tenants/:tenantId/billing/credits` | Apply credit to account balance |
| POST | `/admin/tenants/:tenantId/billing/tier` | Change subscription tier |
| POST | `/admin/tenants/:tenantId/billing/trial/extend` | Extend active trial period |
| POST | `/admin/tenants/:tenantId/billing/grace/extend` | Extend grace period |

**Module Updates:**
- Added PaymentsModule, SubscriptionsModule, TrialsModule, SubscriptionLapseModule imports
- Added Subscription entity to TypeOrmModule
- Added AdminBillingService provider and export

## Test Coverage

**AdminBillingService Tests (17 total):**
- getSubscriptionStatus: 5 tests (combined data, missing tenant, trial info, grace period, payment method failure)
- listInvoices: 3 tests (mapped invoices, empty for no billing, pagination cursor)
- streamInvoicePdf: 1 test (no billing throws NotFoundException)
- applyCredit: 4 tests (success with audit, large credit warning, no billing, missing tenant)
- changeTier: 4 tests (immediate timing, end_of_period, missing subscription, missing tenant)

**AdminController Tests (26 total):**
- createMspTenant: 8 tests
- extendTrial: 4 tests
- extendGracePeriod: 4 tests
- getSubscriptionStatus: 2 tests
- listInvoices: 1 test
- applyCredit: 3 tests
- changeTier: 3 tests

## Commits

| Hash | Message |
|------|---------|
| 19a098e | feat(08-02): add billing audit types and credit/tier change methods |
| 149030c | feat(08-02): add billing endpoints to AdminController |

## Deviations from Plan

**[Rule 1 - Bug] Linter auto-added extendTrial/extendGracePeriod endpoints**

During edit of admin.controller.ts, the linter auto-added partial implementations of extendTrial and extendGracePeriod endpoints (from 08-03 plan). These were already being tracked by the 08-03 plan but were completed early.

- **Found during:** Task 2
- **Issue:** Linter added endpoints with different URL pattern (/billing/tenants/:tenantId/* vs /tenants/:tenantId/billing/*)
- **Fix:** Updated paths to use consistent URL structure (/tenants/:tenantId/billing/trial/extend, /tenants/:tenantId/billing/grace/extend)
- **Impact:** 08-03 plan may have less work to do since these endpoints exist

## Verification Results

- Build: PASSED
- Lint: PASSED (auto-formatting applied)
- Tests: 98 admin module tests pass
- All success criteria met:
  - AuditAction type includes 4 new billing action types
  - AdminBillingService has applyCredit and changeTier methods
  - AdminController has 7 billing endpoints under /admin/tenants/:tenantId/billing/*
  - All endpoints protected by AdminAuthGuard
  - All billing mutations create audit log entries

## Next Phase Readiness

Ready for 08-03: Trial/Grace Extension Enhancement (most work already done)
- extendTrial and extendGracePeriod service methods exist
- Controller endpoints exist
- May only need additional tests or refinements
