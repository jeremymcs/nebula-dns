---
phase: 15-system-health-ui
plan: 01
title: Hooks and Service Status Cards
status: complete
completed: 2026-01-19

subsystem: ui/admin
tags: [system-health, monitoring, swr-hooks, admin-ui]

dependency-graph:
  requires:
    - "06-system-health (backend health endpoints)"
    - "09-admin-auth-ui (admin auth context)"
    - "11-msp-listing-ui (useAdminApi.ts pattern)"
  provides:
    - "useAdminSystemHealth hook with auto-refresh"
    - "useAdminRecentErrors hook"
    - "System Health page at /mission-control/health"
    - "Health navigation in AdminHeader"
  affects:
    - "15-02 (error log and query charts)"

tech-stack:
  added: []
  patterns:
    - "SWR auto-refresh with pause toggle"
    - "Traffic light status indicators"
    - "Service status card grid"

key-files:
  created:
    - ui/src/app/mission-control/health/page.tsx
  modified:
    - ui/src/hooks/useAdminApi.ts
    - ui/src/components/mission-control/AdminHeader.tsx

decisions:
  - id: "15-01-01"
    decision: "30-second auto-refresh interval with pause toggle"
    rationale: "Balances real-time monitoring with API load, matches CONTEXT.md spec"
  - id: "15-01-02"
    decision: "Combine services array and storage object into unified card grid"
    rationale: "Clean UI - all infrastructure components displayed consistently"
  - id: "15-01-03"
    decision: "Show quick stats row below service cards"
    rationale: "Provides at-a-glance metrics without scrolling"

metrics:
  duration: "4 min"
  tasks: 3
  commits: 3
---

# Phase 15 Plan 01: Hooks and Service Status Cards Summary

System Health monitoring foundation with SWR hooks for data fetching and main page displaying service status cards for all DNS infrastructure components.

## What Was Built

### 1. System Health Types and Hooks (useAdminApi.ts)

Added comprehensive TypeScript interfaces and SWR hooks:

**Types:**
- `ServiceHealthStatus` - Union type: 'healthy' | 'degraded' | 'unhealthy'
- `ServiceStatus` - Name, status, latency, error, lastChecked
- `StorageStatus` - Redis and ClickHouse connection status
- `ErrorWindow` - Error count, total queries, error rate
- `ErrorRates` - Last hour and last 24 hours error windows
- `QueryVolume` - Total, blocked, allowed queries
- `SystemHealthResponse` - Full health response structure
- `RecentError` - Error log entry structure

**Hooks:**
- `useAdminSystemHealth(params)` - Fetch system health with auto-refresh
  - `period`: '1h' | '24h'
  - `refreshInterval`: Default 30000ms
  - `isPaused`: Disable auto-refresh
- `useAdminRecentErrors(limit, refreshInterval, isPaused)` - Fetch recent errors

### 2. System Health Page (/mission-control/health)

Created comprehensive monitoring page with:

**Service Status Cards (5 total):**
- policy-svc (ShieldCheckIcon)
- dnsdist (ServerStackIcon)
- unbound (GlobeAltIcon)
- Redis (CircleStackIcon)
- ClickHouse (ChartBarIcon)

**Card Features:**
- Traffic light status indicator (green/yellow/red dot with animation)
- Status badge (healthy/degraded/unhealthy)
- Latency display (e.g., "12ms")
- Last checked relative time (e.g., "Just now", "5s ago")
- Error message display when present

**Quick Stats Row:**
- Total Queries (24h)
- Blocked Queries (24h)
- Error Rate (24h) with color coding
- Error Rate (1h) with color coding

**Controls:**
- Overall status badge in header
- Last updated timestamp
- Pause/Resume auto-refresh toggle
- Manual refresh button

**States:**
- Loading: Skeleton cards
- Error: Error card with retry button

### 3. Header Navigation Link

Added "Health" link to AdminHeader navigation:
- Appears after "MSPs" link
- Same styling pattern as existing links
- Active state highlighting when on /mission-control/health

## Technical Implementation

**SWR Configuration:**
```typescript
{
  ...defaultConfig,
  refreshInterval: isPaused ? 0 : refreshInterval,
}
```

**Traffic Light Colors:**
```typescript
healthy:   bg-success-500 (green)
degraded:  bg-warning-500 (yellow)
unhealthy: bg-danger-500 (red)
```

**Error Rate Coloring:**
- > 1%: red (danger)
- > 0.1%: yellow (warning)
- <= 0.1%: green (success)

## Commits

| Hash | Description |
|------|-------------|
| 5d5973a | feat(15-01): add system health types and hooks |
| 9aed320 | feat(15-01): create system health page with service status cards |
| cd5b17d | feat(15-01): add Health navigation link to AdminHeader |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] TypeScript compiles without errors (existing e2e test error unrelated)
- [x] useAdminSystemHealth and useAdminRecentErrors hooks exist with correct signatures
- [x] System Health page loads at /mission-control/health
- [x] 5 service status cards display (policy-svc, dnsdist, unbound, Redis, ClickHouse)
- [x] Status cards show traffic light colors based on health status
- [x] Header shows Health navigation link with active state
- [x] Loading skeletons display while data fetches

## Next Phase Readiness

Plan 15-02 can proceed:
- `useAdminRecentErrors` hook ready for error log component
- Page layout ready for error list and query volume charts sections
- Auto-refresh infrastructure in place for coordinated data updates
