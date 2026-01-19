# Phase 12: MSP Detail UI - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can view MSP details and drill into clients. The detail page shows MSP overview information, a list of the MSP's clients, usage charts, and action buttons for billing and impersonation. Editing MSP settings and data export are separate capabilities.

</domain>

<decisions>
## Implementation Decisions

### Page layout
- Dashboard-style stat cards at top: MSP name, tier, status, created date as separate small cards in a grid
- Two-column layout below stat cards: clients table on left, usage charts on right
- Both breadcrumbs AND back button: "Mission Control > MSPs > [MSP Name]" breadcrumb path plus "← Back to MSPs" link

### Client list display
- Compact table format with dense rows for more clients visible
- Standard columns: client name, status, location count, queries (24h), blocked percentage
- Search box plus status filter dropdown (active/inactive)
- Row click shows quick actions menu: View Details, Impersonate, Go to Billing

### Usage charts
- Line chart for query volume over time (clean, trend-focused)
- Default to 7 days view
- Preset toggle buttons above chart: 24h / 7d / 30d
- Stacked line chart for blocked vs allowed — shows both proportions over time

### Action buttons
- Placed in the hero/stat cards area alongside MSP info
- "View Billing" as primary (prominent) button, "Impersonate" as secondary
- No confirmation needed for impersonation — clicking immediately starts session
- Just two actions: View Billing and Impersonate — keep it focused

### Claude's Discretion
- Responsive behavior on narrow screens (stack columns appropriately)
- Exact spacing, typography, and visual styling
- Chart library and implementation details
- Loading and error state handling
- Pagination/scroll behavior for client list

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches that match existing Mission Control patterns from Phase 11.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-msp-detail-ui*
*Context gathered: 2026-01-18*
