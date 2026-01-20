# Phase 17: RBAC Foundation (Backend) - Context

// Nebula DNS Admin Dashboard - Phase 17 Context
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend infrastructure for role-based access control. Admin entity gets role column, guards protect endpoints based on role, decorators specify required roles, and JWT tokens include role claims. This phase delivers the enforcement mechanism — UI integration and user management are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Role hierarchy & permissions
- Three roles: super_admin, admin, viewer — hardcoded enum (Claude's discretion)
- Permission boundaries determined by Claude based on typical RBAC patterns
- Viewer scope determined by Claude — reasonable restrictions on sensitive data
- Super_admin-only endpoints determined by Claude based on security best practices

### Role assignment behavior
- **Minimum super_admins:** At least 1 must exist — prevent last super_admin from being downgraded/removed
- **Role change audit:** Full audit trail — log who changed whose role, from what to what, when
- Session invalidation on role downgrade: Claude's discretion (immediate vs next login)
- Self-downgrade rules: Claude's discretion

### Guard & decorator design
- **403 response:** Helpful message — "Requires super_admin role" to aid debugging
- Denial logging level: Claude's discretion
- Default policy for unmarked endpoints: Claude's discretion (but must be documented)
- Role verification source (JWT vs database): Claude's discretion based on security/performance tradeoff

### Break-glass account
- **Emergency recovery:** Yes — CLI command or special mechanism for emergency super_admin creation
- Initial super_admin creation method: Claude's discretion (migration script, env var, etc.)
- Recovery authentication: Claude's discretion (server access vs secret key)
- Break-glass alert behavior: Claude's discretion

### Claude's Discretion
- Whether admins can manage viewers (suspend, reset MFA)
- Exact viewer restrictions on sensitive data
- Which endpoints require super_admin vs admin
- Hardcoded enum vs database-driven roles
- Session behavior on role changes
- Self-downgrade allowance
- Denial logging strategy
- Default policy for unannotated endpoints
- JWT-only vs database role verification
- Break-glass implementation details

</decisions>

<specifics>
## Specific Ideas

- 403 responses should include the required role for debugging purposes
- Role changes must be audited with full context (who, what, when, from, to)
- At least one super_admin must always exist — system should prevent the last one from being demoted

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-rbac-foundation-backend*
*Context gathered: 2026-01-20*
