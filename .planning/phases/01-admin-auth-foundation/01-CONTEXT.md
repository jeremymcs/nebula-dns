# Phase 1: Admin Auth Foundation - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Separate authentication system for admin endpoints. Admin can authenticate via dedicated login, admin routes reject regular tenant JWT tokens, admin auth guard protects all admin routes, and admin session includes admin identity for audit purposes.

</domain>

<decisions>
## Implementation Decisions

### Admin Credentials
- Admins stored in separate database table (`admins` table in PostgreSQL)
- Stricter password requirements than tenant users (longer minimum, mandatory complexity)
- MFA required from day one — no admin access without MFA setup complete
- First admin seeded via migration, then existing admins can invite other admins

### Session Behavior
- Session duration: 8 hours (workday) — re-auth once per day
- Multiple concurrent sessions allowed (admin can be logged in from multiple devices)
- Session revocation: per-admin self-revoke + global emergency revoke for all admin sessions
- Failed login lockout: temporary lockout after N failed attempts (15-30 min)

### Guard Rejection
- Admin endpoints on separate path prefix: `/api/admin/*`
- HTTP 401 Unauthorized when tenant token hits admin endpoint
- Error message is specific: "Admin authentication required" (aids debugging)

### Admin Identity
- JWT includes full admin info: admin_id, email, role, name (no DB lookup needed for audit)
- Single admin role for now — all admins have full access (small ops team)
- Admin tokens use different issuer claim: `iss: 'nebula-admin'` vs tenant tokens

### Claude's Discretion
- Rejected admin endpoint attempt logging strategy (log with rate limiting vs. always log)
- Whether to use separate signing key for admin tokens (security best practice)
- Exact password complexity requirements (length, character classes, rotation)
- Lockout threshold (number of failed attempts before lockout)
- MFA implementation approach (TOTP, WebAuthn, etc.)

</decisions>

<specifics>
## Specific Ideas

- Admin auth should feel like a separate, more secure system than tenant auth
- Ops team is small, so single admin role is sufficient for now
- Auditability is critical — every admin action should be traceable to an admin identity

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-admin-auth-foundation*
*Context gathered: 2026-01-17*
