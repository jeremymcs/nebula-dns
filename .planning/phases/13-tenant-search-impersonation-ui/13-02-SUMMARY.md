---
phase: 13-tenant-search-impersonation-ui
plan: 02
subsystem: ui-impersonation
tags: [ui, react, impersonation, banner, mission-control]
dependency_graph:
  requires: [13-01]
  provides: [impersonation-banner, impersonation-session-management]
  affects: [tenant-dashboard]
tech-stack:
  added: []
  patterns: [custom-hooks, storage-helpers, persistent-banner]
key-files:
  created:
    - ui/src/lib/impersonation.ts
    - ui/src/hooks/useImpersonation.ts
    - ui/src/components/banners/ImpersonationBanner.tsx
  modified:
    - ui/src/components/layout/DashboardLayout.tsx
    - ui/src/components/banners/index.ts
decisions:
  - "Amber banner (bg-amber-500) for high visibility during impersonation"
  - "Eye icon instead of arrows icon for 'viewing as' semantic"
  - "No dismiss option - banner always visible during impersonation (per CONTEXT.md)"
  - "Storage keys: impersonation_token, impersonation_info (JSON)"
  - "End impersonation calls API then redirects to /mission-control"
metrics:
  duration: "2 min"
  completed: "2026-01-19"
---

# Phase 13 Plan 02: Impersonation Banner and Session Management Summary

Persistent amber banner with tenant info and End Impersonation button integrated into DashboardLayout.

## Changes Made

### Task 1: Impersonation Storage Helpers and Hook

Created `ui/src/lib/impersonation.ts`:
- `storeImpersonation(token, info)` - Store token and tenant info in localStorage
- `getImpersonationInfo()` - Get current impersonation info (null if not impersonating)
- `isImpersonating()` - Boolean check for impersonation mode
- `getImpersonationToken()` - Get token for API calls
- `clearImpersonation()` - Clear all impersonation data (preserves admin_token)

Created `ui/src/hooks/useImpersonation.ts`:
- React hook returning `{ impersonationInfo, isImpersonating, endImpersonation }`
- SSR-safe with typeof window checks
- Storage event listener for cross-tab sync
- `endImpersonation()` calls API to blacklist token, clears storage, redirects to /mission-control

### Task 2: ImpersonationBanner Component

Created `ui/src/components/banners/ImpersonationBanner.tsx`:
- Amber background (bg-amber-500) with white text
- Eye icon for "viewing as" indicator
- Shows: "Viewing as: [Tenant Name] (MSP/Business/Home)"
- End Impersonation button (no dismiss option per CONTEXT.md)
- Added export to banners index

### Task 3: DashboardLayout Integration

Updated `ui/src/components/layout/DashboardLayout.tsx`:
- Replaced old partner portal impersonation logic with useImpersonation hook
- Replaced inline banner JSX with ImpersonationBanner component
- Removed unused imports (ArrowsRightLeftIcon, useState)
- End Impersonation now redirects to /mission-control (not /partner/dashboard)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| c7e14b4 | feat | Add impersonation storage helpers and hook |
| f48859e | feat | Add ImpersonationBanner component |
| 04c724f | refactor | Integrate ImpersonationBanner into DashboardLayout |

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

Manual verification flow:
1. Set impersonation state in localStorage:
   ```javascript
   localStorage.setItem('impersonation_token', 'test-token')
   localStorage.setItem('impersonation_info', JSON.stringify({
     tenantId: 'test-id',
     tenantName: 'Test Tenant',
     tenantTier: 'msp',
     startedAt: new Date().toISOString()
   }))
   ```
2. Navigate to /dashboard
3. See amber banner: "Viewing as: Test Tenant (MSP)"
4. Click "End Impersonation"
5. Redirects to /mission-control, localStorage cleared

## Phase 13 Complete

Both plans for Phase 13 (Tenant Search and Impersonation UI) are now complete:
- Plan 01: Global tenant search in header with Spotlight-style dropdown
- Plan 02: Impersonation banner and session management

Admin can now:
1. Search for any tenant from the Mission Control header
2. Click result to immediately start impersonation
3. See persistent amber banner showing tenant context
4. End impersonation to return to Mission Control
