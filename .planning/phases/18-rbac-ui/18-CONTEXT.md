# Phase 18: RBAC UI - Context

// Nebula DNS Admin Dashboard - Phase 18 Context
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Frontend displays admin role information and enforces role-based navigation/access. This phase implements UI for the RBAC backend built in Phase 17. Admin user management UI is Phase 20.

</domain>

<decisions>
## Implementation Decisions

### Role display location
- Show role in BOTH header and profile dropdown
- Header: Colored status badge next to admin name — immediately noticeable
- Dropdown: Role name with permissions list (bullet list of key permissions)

### Navigation filtering
- Hidden entirely — items user can't access are not shown at all
- Claude determines which items to hide based on backend role permissions from Phase 17
- Mutating actions (Edit/Delete buttons, forms) hidden entirely for viewers — not rendered

### Permission denied handling
- Direct URL navigation to restricted page: Redirect to dashboard with toast notification
- Toast message: "You don't have access to that page" or similar
- API 403 responses: Both toast and inline depending on context
  - Toast for page loads
  - Inline error for form submissions
- Claude determines whether toast mentions required role

### Role-based styling
- Distinct colors per role:
  - Super Admin = Red
  - Admin = Blue
  - Viewer = Gray
- Super Admin badge: Color + subtle glow/border for prominence
- Badge format: Text only ('Super Admin', 'Admin', 'Viewer')

### Claude's Discretion
- Whether viewers see persistent read-only reminder (beyond badge)
- Sidebar visual treatment for access levels
- Exact toast message wording (generic vs role-specific)
- Which specific nav items to hide per role (based on RBAC design)

</decisions>

<specifics>
## Specific Ideas

- Role badge should be colored and prominent in header — not subtle
- Super Admin gets extra visual weight (glow/border) to differentiate from regular admin
- Hidden items = cleaner UX than disabled items with tooltips

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-rbac-ui*
*Context gathered: 2026-01-21*
