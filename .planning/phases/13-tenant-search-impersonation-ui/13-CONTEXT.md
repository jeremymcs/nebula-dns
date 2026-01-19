# Phase 13: Tenant Search & Impersonation UI - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can find any tenant and impersonate them through the Mission Control UI. This includes a global search for tenants, initiating impersonation sessions, visual indicators during impersonation, and ending impersonation to return to admin context. Creating/editing tenants and billing actions are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Search Experience
- Header search bar — always visible in top nav, accessible from any page
- Dropdown results appear below search as typing (Spotlight/Alfred style)
- Debounced search at 300ms — responsive without API overload
- Search by name, email, or tenant ID (existing API supports this)

### Impersonation Indicator
- Full-width amber/yellow banner at top of screen
- Always visible — cannot be dismissed during impersonation
- Content: "Viewing as: [Tenant Name] (MSP)" or "(Business)" with End Impersonation button
- Banner serves as constant reminder of elevated context

### Session Transitions
- Starting impersonation: No confirmation dialog, direct action
- Landing page after start: Tenant's main dashboard
- Ending impersonation: No confirmation dialog, direct action
- Landing page after end: Mission Control dashboard
- Consistent with Phase 12 decisions (direct impersonation without confirmation)

### Search Result Actions
- Each row shows: Tenant name, email below, type badge on right
- Click result to immediately start impersonation (primary action)
- Hover reveals "View Details" link for Mission Control navigation (secondary)
- MSP tenants: Colored badge (e.g., purple)
- Regular/Business tenants: Muted badge

### Claude's Discretion
- Exact number of results in dropdown (5-10 range)
- Specific badge colors for MSP vs Business
- Loading states and empty state messaging
- Keyboard navigation in search dropdown
- Search input placeholder text

</decisions>

<specifics>
## Specific Ideas

- Search should feel like macOS Spotlight — fast, keyboard-friendly, instant results
- Banner must be unmissable — admin should never accidentally act as tenant without realizing
- Direct actions (no confirmations) for speed — ops team uses this frequently

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-tenant-search-impersonation-ui*
*Context gathered: 2026-01-18*
