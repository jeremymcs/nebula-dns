---
phase: 20-admin-user-management-ui
plan: 03
subsystem: ui
tags: [react, typescript, table, admin-management, invitations]

# Dependency graph
requires:
  - phase: 20-01
    provides: Admin user types and API hooks (AdminListItem, AdminInvitation, revokeAdminInvitation)
provides:
  - AdminUsersTable component for displaying admin user listings
  - PendingInvitesSection component for showing and revoking invitations
affects: [20-04, 20-05, 20-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Custom relative time formatting without date-fns
    - Skeleton loading states for tables and cards
    - ConfirmDialog pattern for destructive actions

key-files:
  created:
    - admin-ui/src/components/admin-users/AdminUsersTable.tsx
    - admin-ui/src/components/admin-users/PendingInvitesSection.tsx
  modified: []

key-decisions:
  - "Custom formatTimeAgo implementation instead of date-fns (package not in dependencies)"
  - "Filter pendingInvites to only status=pending before display"
  - "Expiry countdown shows days/hours/minutes based on remaining time"

patterns-established:
  - "Admin table pattern: avatar initials + name/email + role badge + status badge + action column"
  - "Invitation card pattern: icon + email + role + invited-by + expiry countdown + action button"

# Metrics
duration: 2min
completed: 2026-01-22
---

# Phase 20 Plan 03: Admin Users Table & Pending Invites Summary

**Admin users table with role/status/MFA badges and pending invites section with expiry countdown and revoke flow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-22T02:37:31Z
- **Completed:** 2026-01-22T02:39:45Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- AdminUsersTable displays admin listing with all required columns (name, email, role, status, MFA, last login, created)
- Table rows are clickable to trigger onRowClick handler for detail drawer
- PendingInvitesSection shows invites with expiry countdown (days/hours/minutes/expired)
- Revoke button opens ConfirmDialog and calls revokeAdminInvitation API
- Both components have proper loading skeletons and empty states
- Full dark mode support throughout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AdminUsersTable component** - `ab028f1` (feat)
2. **Task 2: Create PendingInvitesSection component** - `dd738e9` (feat)

**Plan metadata:** (to be created)

## Files Created/Modified

- `admin-ui/src/components/admin-users/AdminUsersTable.tsx` - Table component displaying admin users list with avatar, role badge, status badge, MFA icon, last login, created date (247 lines)
- `admin-ui/src/components/admin-users/PendingInvitesSection.tsx` - Section showing pending invitations with expiry countdown and revoke action (235 lines)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Custom formatTimeAgo without date-fns | Package not in admin-ui dependencies, native Date API sufficient |
| Filter to status=pending before display | Only show actionable invitations, not accepted/revoked/expired |
| Show countdown in days/hours/minutes | More informative than raw date for time-sensitive invitations |
| Use avatar initials instead of UserIcon | More visually distinct in table rows |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AdminUsersTable ready for integration into Admin List page (20-05)
- PendingInvitesSection ready for integration into Admin List page (20-05)
- Components follow existing admin-ui patterns for consistent UX
- AdminRoleBadge integration verified
- revokeAdminInvitation API integration verified

---
*Phase: 20-admin-user-management-ui*
*Plan: 03*
*Completed: 2026-01-22*
