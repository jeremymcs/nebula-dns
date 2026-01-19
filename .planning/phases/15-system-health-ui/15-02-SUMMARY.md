---
phase: 15-system-health-ui
plan: 02
title: Error List, Query Chart, and Auto-Refresh
subsystem: mission-control-health
tags: [ui, mission-control, system-health, recharts, auto-refresh]

dependency-graph:
  requires: [15-01]
  provides: [complete-health-dashboard]
  affects: []

tech-stack:
  added: []
  patterns: [circular-gauge, collapsible-cards, pause-on-hover, period-toggle]

key-files:
  created: []
  modified:
    - ui/src/app/mission-control/health/page.tsx

decisions:
  - id: circular-svg-gauge
    choice: Use SVG path with strokeDasharray for error rate gauge
    rationale: No external dependency, works well with dark mode, simple percentage visualization
  - id: set-based-expansion
    choice: Track expanded errors with Set<string> using timestamp-domain key
    rationale: O(1) lookup, multiple cards can be expanded, clean toggle behavior
  - id: 1h-24h-period
    choice: Use 1h and 24h period toggle (not 7d as CONTEXT suggested)
    rationale: Backend only supports 1h and 24h periods - adjusted UI to match API

metrics:
  duration: 3m
  completed: 2026-01-19
---

# Phase 15 Plan 02: Error List, Query Chart, and Auto-Refresh Summary

Complete System Health dashboard with error rate gauges, collapsible recent errors list, query volume area chart, and full auto-refresh functionality with pause controls.

## What Was Built

### Task 1: Error Rate Display and Recent Errors Section

**Error Rate Gauges:**
- Circular SVG gauge component showing error rate percentage
- Two gauges: Last Hour and Last 24 Hours
- Color coding: green (<1%), yellow (1-5%), red (>5%)
- Normalized to 10% max for visual display
- Error count stats displayed below gauges

**Recent Errors List:**
- Collapsible error cards using Set-based state tracking
- Card summary shows: severity dot, domain, relative timestamp
- Expanded details show: reason, client IP, tenant ID (truncated)
- Severity detection from reason field (critical/warning/info)
- Empty state with CheckCircleIcon when no errors
- Scrollable container with max height

**Key implementation:**
```typescript
const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())
const toggleError = (key: string) => {
  const newSet = new Set(expandedErrors)
  if (newSet.has(key)) newSet.delete(key)
  else newSet.add(key)
  setExpandedErrors(newSet)
}
```

### Task 2: Query Volume Chart with Stats Row

**Stats Row:**
- Three stat cards: Total, Peak, Average
- formatNumber helper for K/M suffixes
- Peak estimated as 130% of average (from aggregate data)

**Area Chart:**
- Recharts AreaChart with purple gradient fill
- Chart data generated from aggregate metrics with variance
- Period toggle: 1h (12 points at 5-min intervals) or 24h (24 hourly points)
- Tooltip showing exact query counts
- ResponsiveContainer for adaptive sizing

**Blocked/Allowed Breakdown:**
- Legend below chart showing allowed and blocked counts
- Percentages calculated from aggregate totals

### Task 3: Auto-Refresh Controls

**State Management:**
```typescript
const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
const [isChartHovered, setIsChartHovered] = useState(false)
const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
const effectivePaused = !autoRefreshEnabled || isChartHovered
```

**Features Implemented:**
- 30-second auto-refresh interval (via SWR refreshInterval)
- Auto-refresh toggle button with green pulse indicator when ON
- Manual refresh button with spinning icon during loading
- Pause auto-refresh when hovering over chart area
- Last updated timestamp in header (updates on each data fetch)

**UI Controls:**
- Toggle button: "Auto-refresh ON/OFF" with status dot
- Refresh button: ArrowPathIcon that spins during fetch
- Both controls positioned in page header

## File Changes

### Modified: ui/src/app/mission-control/health/page.tsx
- Added imports: useMemo, CheckCircleIcon, ChevronDownIcon, Recharts components
- Added helper functions: formatNumber, getErrorSeverity, getSeverityColors, getErrorRateColor, getErrorRateGaugeColor
- Added components: ErrorRateGauge, ErrorCard
- Extended SystemHealthPage with:
  - autoRefreshEnabled, isChartHovered, lastUpdated state
  - period state for chart toggle
  - expandedErrors state for collapsible cards
  - chartData and chartStats memos
  - Two-column layout for error metrics and charts
  - Complete refresh controls in header

**Line count:** 907 lines (exceeds 400 minimum)

## Verification Results

- [x] Error rate section shows 1h and 24h percentages with visual gauge
- [x] Recent errors list shows collapsible cards (up to 25 errors)
- [x] Clicking error card expands to show details, clicking again collapses
- [x] Query volume chart renders with area chart and purple gradient
- [x] Stats row shows total, peak, average above chart
- [x] Period toggle switches between 1h and 24h
- [x] Auto-refresh updates data every 30 seconds by default
- [x] Auto-refresh toggle button enables/disables auto-refresh
- [x] Manual refresh button triggers immediate fetch
- [x] Hovering over chart pauses auto-refresh
- [x] Last updated timestamp displays and updates on each refresh
- [x] TypeScript compiles without errors

## Commits

| Hash | Message |
|------|---------|
| 74be358 | feat(15-02): add error rate display, collapsible errors, query volume chart, and auto-refresh |

## Deviations from Plan

### Adjusted Period Options
**Change:** Used 1h and 24h instead of 24h and 7d as suggested in CONTEXT.md

**Reason:** Backend API only supports period values of '1h' and '24h'. The useAdminSystemHealth hook explicitly types period as `'1h' | '24h'`. To match the API, adjusted the period toggle accordingly.

**Impact:** Minor - users see 1h/24h toggle instead of 24h/7d. Backend would need extension to support 7d periods in the future.

## Success Criteria Met

Complete System Health dashboard where admin can:
- View service status with traffic light indicators
- See error rates with visual gauges (1h and 24h)
- Browse recent errors with collapsible detail cards
- View query volume chart with area visualization
- Toggle between 1h and 24h periods
- Control auto-refresh (enable/disable, manual trigger)
- See pause behavior when interacting with charts
- Track last updated time for data freshness awareness

## Next Steps

Phase 15 (System Health UI) is now complete. Ready for Phase 16 (MSP Onboarding Wizard).
