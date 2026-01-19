# Phase 11: MSP Listing UI - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Display paginated, searchable table of MSP accounts in Mission Control. Admins can browse all MSPs, filter by status, search by name/email/ID, and navigate to detail pages. This is a data listing UI — the detail page, impersonation flow, and onboarding wizard are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Table layout & columns
- Full details columns: Name, client count, status, total queries, tier, contact email, created date
- Rows are clickable (navigate to detail page) AND have action menu (three-dot)
- Comfortable row density — moderate spacing for balance of data visibility and readability

### Row action menu
- Claude's discretion on which quick actions to include based on available API endpoints
- At minimum: View details, Impersonate

### Search behavior
- Searchable fields: MSP name, contact email, and internal ID
- Status filter dropdown (active/suspended/trial) in addition to text search
- Claude's discretion on instant filter vs submit-to-search and URL persistence

### Pagination style
- Infinite scroll (not page numbers)
- Claude's discretion on batch size, jump-to navigation, and total count indicator

### Empty & loading states
- No results: "No MSPs found. Try adjusting your search or filters." (text message with suggestion)
- Loading indicator: Claude's discretion (skeleton vs spinner based on codebase patterns)
- Zero MSPs state: Claude's discretion (differentiate from filtered no-results if helpful)
- Error handling: Claude's discretion on inline vs toast based on UX patterns

### Claude's Discretion
- Search debounce timing and instant vs submit behavior
- URL state persistence for search/filter params
- Batch size for infinite scroll
- Whether to include alphabet quick-nav or total count
- Loading indicator style (skeleton rows vs spinner)
- Specific quick actions in row menu beyond view/impersonate
- Error state presentation (inline vs toast)
- Differentiation between "no results" and "zero MSPs in system"

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches based on existing Mission Control patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-msp-listing-ui*
*Context gathered: 2026-01-18*
