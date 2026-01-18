---
phase: 08-billing-operations
plan: 01
subsystem: admin-billing
tags: [stripe, billing, invoices, subscriptions, admin]
requires:
  - "07-msp-onboarding"
provides:
  - "Billing DTOs for admin operations"
  - "PaymentsService Stripe extensions"
  - "AdminBillingService for subscription/invoice ops"
affects:
  - "08-02"
tech-stack:
  added: []
  patterns:
    - "Stripe invoice listing with pagination"
    - "PDF streaming via axios"
    - "Combined data aggregation from multiple services"
key-files:
  created:
    - "api/src/modules/admin/dto/billing.dto.ts"
    - "api/src/modules/admin/admin-billing.service.ts"
    - "api/src/modules/admin/admin-billing.service.spec.ts"
  modified:
    - "api/src/modules/payments/payments.service.ts"
decisions:
  - id: "BILL-01"
    decision: "Use limit+1 pattern for hasMore detection in invoice pagination"
    rationale: "Standard Stripe pagination pattern avoids extra count queries"
  - id: "BILL-02"
    decision: "Negate credit amount (-Math.abs) when calling Stripe balance transaction"
    rationale: "Stripe convention: negative = credit to customer"
  - id: "BILL-03"
    decision: "Stream PDF via axios with pipe to response"
    rationale: "Avoids buffering large PDFs in memory"
  - id: "BILL-04"
    decision: "Combine data from local DB, Stripe, trials, and grace period services"
    rationale: "Single comprehensive subscription status view for admin"
metrics:
  duration: "6 min"
  completed: "2026-01-18"
---

# Phase 8 Plan 01: Billing DTOs and Service Layer Summary

JWT auth with refresh rotation using jose library - Admin billing foundation with subscription status and invoice listing.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create billing DTOs | 5188249 | api/src/modules/admin/dto/billing.dto.ts |
| 2 | Extend PaymentsService | da9c854 | api/src/modules/payments/payments.service.ts |
| 3 | Create AdminBillingService | a581071 | admin-billing.service.ts, admin-billing.service.spec.ts |

## Decisions Made

### BILL-01: Pagination with limit+1 pattern
- Use `limit + 1` in Stripe API calls to detect `hasMore` without extra queries
- Slice results back to requested limit before returning

### BILL-02: Credit amount sign convention
- Stripe uses negative amounts for customer credits
- Always negate input: `-Math.abs(amountCents)`
- Positive input from admin = credit to customer

### BILL-03: PDF streaming approach
- Use axios with `responseType: 'stream'`
- Set `Content-Type: application/pdf` and `Content-Disposition: attachment`
- Pipe directly to Express response to avoid memory buffering

### BILL-04: Aggregated subscription status
- Combine data from: local Subscription entity, Stripe customer, TrialsService, SubscriptionLapseService
- Include payment method last4 from Stripe (with graceful failure handling)
- Generate Stripe dashboard link for quick admin access

## Implementation Details

### Billing DTOs (11 classes)
- **SubscriptionStatusResponseDto**: Full subscription details with trial/grace period info
- **InvoiceDto/InvoiceListQueryDto/InvoiceListResponseDto**: Invoice listing with pagination
- **ApplyCreditDto/CreditAppliedResponseDto**: Credit operations (max $10k per transaction)
- **ChangeTierDto/TierChangeResponseDto**: Tier change with immediate/end_of_period timing
- **ExtendTrialDto/ExtendGracePeriodDto/ExtensionResponseDto**: Extension operations

### PaymentsService Extensions (6 methods)
1. `listInvoices(customerId, options)` - Paginated invoice list
2. `getInvoicePdfWithValidation(invoiceId, expectedCustomerId)` - PDF with ownership check
3. `getDefaultPaymentMethod(customerId)` - Retrieve default payment method
4. `applyCredit(customerId, amountCents, description, metadata)` - Create balance transaction
5. `changeSubscriptionPlan(subscriptionId, newPriceId, timing)` - Update subscription plan
6. `extendTrialPeriod(subscriptionId, additionalDays)` - Extend trial with 730-day max

### AdminBillingService (3 methods)
1. `getSubscriptionStatus(tenantId)` - Combined subscription status from all sources
2. `listInvoices(tenantId, query)` - Map Stripe invoices to DTOs
3. `streamInvoicePdf(tenantId, invoiceId, res)` - Stream PDF to response

## Test Coverage

- 9 unit tests for AdminBillingService
- Tests cover: happy paths, missing tenant, trial info, grace period info, payment method failure, invoice pagination, empty billing

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 08-02:
- [ ] Billing DTOs available for controller endpoints
- [ ] PaymentsService methods ready for credit/tier/extension operations
- [ ] AdminBillingService ready for module integration
- [ ] Need to register AdminBillingService in AdminModule
- [ ] Need to add billing endpoints to AdminController
