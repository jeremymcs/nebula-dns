# Phase 14: Billing Portal UI - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin billing management interface for Mission Control. Enables viewing and managing tenant subscriptions, invoices, credits, and payment methods. Accessed from dedicated nav item with tenant context required.

</domain>

<decisions>
## Implementation Decisions

### Page layout & navigation
- Claude decides page organization (tabs vs sections vs scrollable)
- Dedicated nav item in Mission Control sidebar for Billing
- If no tenant context: redirect to MSP list with message to select tenant first
- Tenant identity shown via both breadcrumb (Mission Control > MSPs > [Tenant] > Billing) AND page header

### Subscription display
- Balanced stat cards for tier, status, dates, credits (equal visual weight)
- Credit balance shown prominently as one of the stat cards
- Danger states: color-coded cards (green/amber/red) PLUS alert banner for critical states (suspended)
- Full history context for dates: created, trial dates, grace period dates, subscription changes

### Billing actions UX
- Action buttons inline next to relevant cards ('Change Tier' by tier card, 'Add Credit' by credits)
- All billing actions require confirmation modal with details
- Apply Credit modal: amount field, optional expiry date, reason field
- Change Tier: comparison view showing current vs new tier features side-by-side before confirming

### Invoice & payment UI
- Invoice history: expandable rows (click to see line items inline)
- PDF download: both options available (download icon + 'View' link for new tab)
- Payment method display: Claude decides (card tiles vs list)
- Add Payment Method: Stripe Elements embedded in modal

### Claude's Discretion
- Page organization structure (tabs, sections, or single page)
- Payment method visual presentation (tiles vs list)
- Exact card layouts and spacing
- Loading states and error handling
- Invoice table columns beyond essentials

</decisions>

<specifics>
## Specific Ideas

- Breadcrumb plus tenant name in header for clear context (admin managing another tenant's billing)
- Tier change should show feature comparison so admin understands impact
- Alert banners for critical states like suspended accounts need to be obvious

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-billing-portal-ui*
*Context gathered: 2026-01-19*
