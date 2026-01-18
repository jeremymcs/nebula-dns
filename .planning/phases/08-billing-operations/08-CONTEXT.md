# Phase 8: Billing Operations - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin interfaces for viewing and managing tenant billing. This includes viewing subscription status and invoice history, applying credits/adjustments to accounts, changing subscription tiers, and extending trials or grace periods. All operations target existing tenants via the admin dashboard.

</domain>

<decisions>
## Implementation Decisions

### Subscription Display
- Full subscription details including plan, status, renewal date, payment method, Stripe customer link, billing email
- Invoice history with pagination (last 20, load more)
- Invoice PDF download via our API (fetch from Stripe and serve)
- Include usage context against plan limits where relevant

### Credit/Adjustment Workflow
- Credits applied as Stripe customer credit balance (auto-applies to next invoice)
- Reason required for all credit operations (audit trail)
- Soft limits with warning above threshold but allow proceed
- All credit operations logged in admin audit logs

### Tier Change Behavior
- Admin can select immediate or end-of-period timing per change
- Allow downgrade even if tenant exceeds new limits (show warning)
- Admin can change between any tiers (Home/Enterprise/MSP)
- Reason required for tier changes (audit trail)

### Trial/Grace Management
- Grace period covers both post-trial and failed payment scenarios
- Per-extension max (e.g., 14 days) with ability to extend multiple times
- Admin chooses whether to notify tenant via email per extension
- Reason required for extensions (audit trail)

### Claude's Discretion
- Exact pagination limits for invoice history
- Specific threshold amounts for credit warnings
- Default extension durations
- Proration calculation approach for immediate tier changes
- Error handling for Stripe API failures

</decisions>

<specifics>
## Specific Ideas

- Invoice PDF download should be seamless (via our API, not redirecting to Stripe)
- Admin notification choice per trial/grace extension provides flexibility for different scenarios

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-billing-operations*
*Context gathered: 2026-01-18*
