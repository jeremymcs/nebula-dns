# Phase 10: Payment Methods Backend - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

API endpoints for admins to manage tenant payment methods via Stripe. Covers listing payment methods, adding new payment methods, and setting the default payment method. UI integration is Phase 14.

</domain>

<decisions>
## Implementation Decisions

### API Response Format
- Claude's discretion on card details to return (likely: brand, last4, exp_month, exp_year, is_default, created_at)
- Claude's discretion on whether to expose Stripe payment method IDs directly vs internal IDs
- Claude's discretion on whether to include Stripe customer ID in response
- Claude's discretion on payment types to support (cards only vs all Stripe types)

### Add Payment Flow
- Claude's discretion on token flow (SetupIntent vs direct PaymentMethod)
- Claude's discretion on auto-default behavior for first payment method
- Claude's discretion on whether to include DELETE endpoint in this phase
- Claude's discretion on Stripe customer auto-creation if tenant has none

### Error Handling
- Let Stripe validate card details (no pre-validation in API)
- Claude's discretion on error format (pass-through vs normalized)
- Claude's discretion on delete protection for default/only payment method
- Claude's discretion on whether to audit log failed operations

### Authorization Scope
- Claude's discretion on which admin roles can manage payment methods
- Claude's discretion on tenant scope (any tenant vs assigned only)
- Claude's discretion on audit note requirements
- Claude's discretion on route location (admin routes vs existing billing)

### Claude's Discretion
This phase has extensive Claude discretion. Key areas:
- Response field selection based on Phase 14 Billing Portal UI needs
- Stripe integration patterns based on existing payments module
- Route structure based on existing admin API patterns
- Error handling based on existing API error patterns
- Audit logging based on existing billing audit patterns

</decisions>

<specifics>
## Specific Ideas

- User explicitly chose "Let Stripe validate" for card validation — no redundant validation in API
- All other implementation details deferred to Claude based on existing codebase patterns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-payment-methods-backend*
*Context gathered: 2026-01-18*
