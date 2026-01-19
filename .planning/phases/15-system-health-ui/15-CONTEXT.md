# Phase 15: System Health UI - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can monitor DNS infrastructure health through the UI. Display service status, error metrics, and aggregate query volumes with automatic refresh. This is a monitoring dashboard — alerting, notifications, and historical trend analysis are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Service Status Display
- Card grid layout — each service as a card with icon, name, status indicator
- Services: Claude determines from existing health endpoints in backend
- Traffic light colors: Green = up, Yellow = degraded, Red = down
- Cards show status + uptime percentage (24h or 7d)

### Error Presentation
- Error rate displayed as percentage gauge (visual gauge showing error rate %)
- Recent errors as collapsible cards — each error expandable with summary/details
- Severity levels: Critical/Warning/Info with color coding
- Show last 25 errors in the list

### Query Volume Charts
- Area chart for query volume over time (filled area under line)
- Time range toggle: 24h / 7d
- Breakdown by component (separate series per DNS component)
- Stats row above chart: total queries, peak, average for period

### Auto-Refresh Behavior
- 30-second refresh interval
- Last updated timestamp displayed (no countdown)
- Manual refresh button available
- Auto-pause toggle option for admin to disable auto-refresh
- Pause refresh on chart hover/interaction (resume after)

### Claude's Discretion
- Exact gauge visualization style
- Card icon choices for each service
- Chart color palette for component series
- Error card expand/collapse animation
- Timestamp format and placement

</decisions>

<specifics>
## Specific Ideas

- Traffic light colors are familiar from other monitoring tools (like status page services)
- Collapsible error cards let admin scan quickly and drill into specific issues
- Pause-on-hover prevents jarring updates while admin is reading data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-system-health-ui*
*Context gathered: 2026-01-19*
