---
phase: 09-admin-auth-ui
plan: 02
subsystem: ui-auth
tags: [admin, auth, session, header, logout, modal, mission-control]

dependency-graph:
  requires: [09-01-admin-auth-context]
  provides: [admin-header, session-warning-modal, protected-layout]
  affects: [mission-control-dashboard]

tech-stack:
  added: []
  patterns: [session-expiry-check, controlled-modal, route-protection]

key-files:
  created:
    - ui/src/components/mission-control/AdminHeader.tsx
    - ui/src/components/mission-control/SessionWarningModal.tsx
  modified:
    - ui/src/app/mission-control/layout.tsx

decisions:
  - id: no-confirmation-logout
    choice: "Direct logout without confirmation dialog"
    reason: "Admin portal follows immediate action pattern per RESEARCH.md"
  - id: new-tab-reauthentication
    choice: "Stay Logged In opens login in new tab"
    reason: "Preserves current work state while allowing re-authentication"
  - id: warning-dismiss-tracking
    choice: "Track warning dismissed state to avoid repeated modals"
    reason: "Better UX - user acknowledged the warning, don't interrupt again"

metrics:
  duration: "4 min"
  completed: "2026-01-18"
---

# Phase 9 Plan 2: Admin Session UI Summary

**One-liner:** Admin header with session indicator/logout and 5-minute session expiry warning modal for Mission Control.

## What Was Built

### Task 1: AdminHeader Component (`ui/src/components/mission-control/AdminHeader.tsx`)
Created simplified header for Mission Control admin portal:
- Logo with RocketLaunchIcon and "Mission Control" subtitle
- Theme toggle button (light/dark mode)
- Admin user menu with avatar/initials dropdown
- Admin info display: name, email, "Admin" badge
- Sign out button with danger styling (no confirmation dialog)
- Glass effect background matching existing TopNav pattern
- Responsive: hides name on small screens, always shows avatar

### Task 2: SessionWarningModal (`ui/src/components/mission-control/SessionWarningModal.tsx`)
Created session expiry warning modal:
- ClockIcon with warning (amber) color scheme
- "Session Expiring Soon" title with countdown
- Message showing minutes remaining
- Info text explaining re-authentication flow
- "Stay Logged In" button - opens login in new tab
- "Log Out Now" button - triggers immediate logout
- Backdrop blur and centered modal design

### Task 3: Mission Control Layout Update (`ui/src/app/mission-control/layout.tsx`)
Replaced tenant auth with admin auth protection:
- Uses `useAdminAuth()` instead of `useAuth()`
- Removed impersonation banner (not used in admin portal)
- Removed TopNav, MobileNav, OrionFAB (admin has simplified UI)
- Route protection with returnUrl query param
- Session expiry check every 30 seconds
- Shows SessionWarningModal 5 minutes before expiry
- Tracks warning dismissed state
- Resets dismissed state when session is refreshed
- Login page renders without header

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Logout confirmation | Not included | Admin portal follows immediate action pattern |
| Re-authentication | Opens login in new tab | Preserves current work state |
| Warning interval | 30 second checks | Balance between responsiveness and performance |
| Dismiss tracking | Track per-session | Avoid interrupting user repeatedly |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| UI builds without TypeScript errors | Pass |
| AdminHeader shows user menu | Pass (in component) |
| Logout calls logout() directly | Pass (no confirmation) |
| SessionWarningModal exports | Pass |
| Layout uses useAdminAuth() | Pass |
| Layout has session check logic | Pass |

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `ui/src/components/mission-control/AdminHeader.tsx` | Created | 149 |
| `ui/src/components/mission-control/SessionWarningModal.tsx` | Created | 142 |
| `ui/src/app/mission-control/layout.tsx` | Modified | 164 |

## Commits

| Hash | Description |
|------|-------------|
| 54358b6 | feat(09-02): create AdminHeader component for Mission Control |
| 033d7e4 | feat(09-02): create SessionWarningModal for session expiry warning |
| fee0fa8 | feat(09-02): update Mission Control layout with admin auth protection |

## Success Criteria Met

- [x] AUTH-02: Admin sees session status (name/avatar) in header
- [x] AUTH-03: Admin can click logout and is returned to login page
- [x] AUTH-04: Unauthenticated access redirects to login with return URL preserved
- [x] Session warning modal appears 5 minutes before expiry

## Phase Completion

Phase 09-admin-auth-ui is now complete.

**Delivered:**
- Admin login page with split-screen design
- Admin auth context with separate localStorage keys
- Admin header with session indicator and logout
- Session expiry warning modal
- Protected route handling for Mission Control

**Phase 10 readiness:** Ready to proceed with Payment Methods Backend.
