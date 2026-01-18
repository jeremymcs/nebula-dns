# Phase 9: Admin Auth UI - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can securely access Mission Control through the UI. This phase delivers:
- Login page for admin authentication
- Session status display showing logged-in admin
- Logout functionality
- Protected route handling with automatic redirects

Creating admin accounts, password reset, or MFA are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Login page design
- Split-screen layout: form on one side, branding on other
- Branding side: Nebula logo with "Mission Control" tagline, solid color background
- Error presentation: Both inline (field-level validation) and toast (auth failures)

### Session indicator
- Location: Header right area with dropdown
- Display: Avatar (or initials) with "Admin" role badge, name visible in dropdown
- Timeout warning: Modal dialog warns 5 minutes before session expiry with "Stay logged in" button
- Dropdown menu: Link to profile settings + logout option

### Logout behavior
- Redirect destination: Login page with "You have been logged out" confirmation message
- Multiple sessions: Allow admin to be logged in from multiple devices/browsers simultaneously

### Protected route handling
- Loading state: Full page centered spinner while checking auth state
- Unauthenticated access: Show brief "Access denied" message, then redirect to login with return URL preserved
- API 401 handling: Attempt token refresh first, logout only if refresh fails

### Claude's Discretion
- "Remember me" checkbox: Determine based on security best practices for admin portals
- Logout confirmation dialog: Determine based on UX best practices
- State clearing on logout: Determine appropriate strategy (auth tokens vs full clear)
- Loading spinner design and timing
- Exact "Access denied" message duration before redirect

</decisions>

<specifics>
## Specific Ideas

No specific product references mentioned — open to standard approaches that match the existing Nebula DNS UI patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-admin-auth-ui*
*Context gathered: 2026-01-18*
