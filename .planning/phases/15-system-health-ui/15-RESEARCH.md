# Phase 15: System Health UI - Research

**Researched:** 2026-01-19
**Domain:** Admin UI for DNS Infrastructure Health Monitoring
**Confidence:** HIGH

## Summary

Phase 15 builds a System Health dashboard in Mission Control for administrators to monitor DNS infrastructure status. The backend (Phase 6) already provides comprehensive health endpoints via `AdminHealthService`. The UI needs to display service status cards, error metrics, query volume charts, and auto-refresh functionality.

The project has established patterns from Phase 11-14 Mission Control pages for admin data fetching (SWR with `admin_token`), card-based layouts, and chart rendering (Recharts AreaChart). The backend returns structured health data including service statuses (healthy/degraded/unhealthy), error rates, query volumes, and storage status for policy-svc, dnsdist, unbound, Redis, and ClickHouse.

**Primary recommendation:** Use existing SWR patterns from `useAdminApi.ts` with `refreshInterval: 30000` for auto-refresh. Implement Recharts AreaChart for query volume (matches MSP detail page pattern). Use Card/Badge components for status display.

## Backend Endpoints Available

### Primary Health Endpoint

**Endpoint:** `GET /admin/system/health`
**Query:** `?period=1h|24h`
**Auth:** `admin_token` (AdminAuthGuard)

**Response Shape:**
```typescript
interface SystemHealthResponseDto {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  services: ServiceStatusDto[]  // policy-svc, dnsdist, unbound
  storage: StorageStatusDto     // clickhouse, redis
  errorRates: ErrorRatesDto
  queryVolume: QueryVolumeDto
  timestamp: string
}

interface ServiceStatusDto {
  name: string                  // 'policy-svc' | 'dnsdist' | 'unbound'
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs?: number
  error?: string
  lastChecked: string
}

interface StorageStatusDto {
  clickhouse: { connected: boolean; latencyMs?: number; consecutiveFailures: number; error?: string }
  redis: { connected: boolean; latencyMs?: number; error?: string }
}

interface ErrorRatesDto {
  lastHour: { errorCount: number; totalQueries: number; errorRate: number }
  last24Hours: { errorCount: number; totalQueries: number; errorRate: number }
  isMockData: boolean
}

interface QueryVolumeDto {
  totalQueries: number
  blockedQueries: number
  allowedQueries: number
  period: '1h' | '24h'
  isMockData: boolean
}
```

### Recent Errors Endpoint

**Endpoint:** `GET /admin/system/errors`
**Query:** `?limit=1-100` (default 20)

**Response Shape:**
```typescript
interface RecentErrorDto {
  timestamp: string
  domain: string
  reason: string             // e.g., 'policy_error'
  clientIp: string
  tenantId: string
}
```

### Query Volume Endpoint (Separate)

**Endpoint:** `GET /admin/system/query-volume`
**Query:** `?period=1h|24h`

Returns same `QueryVolumeDto` shape - useful for independent refresh.

### Services Tracked

Per `AdminHealthService` implementation:
| Service | Name | Health Check Method |
|---------|------|---------------------|
| Policy Service | `policy-svc` | HTTP GET `/health` |
| DNSdist | `dnsdist` | HTTP GET `/` (web server) |
| Unbound | `unbound` | DNS resolution test (google.com) |
| Redis | (storage) | Ping command |
| ClickHouse | (storage) | Connection status check |

## UI Patterns to Follow

### Admin Data Fetching Pattern

**File:** `ui/src/hooks/useAdminApi.ts`

```typescript
import useSWR, { SWRConfiguration } from 'swr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  errorRetryInterval: 5000,
  dedupingInterval: 10000,
  focusThrottleInterval: 30000,
  keepPreviousData: true,
}

async function adminFetcher<T>(endpoint: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}
```

### Auto-Refresh Pattern

Existing patterns in `useApi.ts`:
- 30 seconds: DNS queries streaming (`refreshInterval: 30000`)
- 60 seconds: Usage stats
- 2 seconds: Real-time polling

**For System Health:** Use 30 seconds per CONTEXT.md decision.

```typescript
const { data, error, isLoading, mutate } = useSWR<SystemHealthResponse>(
  '/admin/system/health?period=24h',
  adminFetcher,
  {
    ...defaultConfig,
    refreshInterval: 30000,  // 30 second auto-refresh
  }
)
```

### Page Structure Pattern

From `mission-control/msps/page.tsx` and `mission-control/tenants/[id]/billing/page.tsx`:

```tsx
export default function SystemHealthPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-space-900 dark:text-white">System Health</h1>
          <p className="mt-2 text-space-500 dark:text-space-400">...</p>
        </div>
        {/* Action buttons */}
      </div>

      {/* Content sections */}
    </div>
  )
}
```

### Stat Card Pattern

From `ui/src/components/ui/Card.tsx`:

```tsx
<Card variant="glass" padding="md">
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
      <IconComponent className="h-5 w-5 text-primary-600 dark:text-primary-400" />
    </div>
    <div>
      <p className="text-xs text-space-500 dark:text-space-400">Label</p>
      <p className="text-lg font-semibold text-space-900 dark:text-white">Value</p>
    </div>
  </div>
</Card>
```

### Status Badge Pattern

Traffic light colors per CONTEXT.md:
- Green = healthy/up
- Yellow = degraded
- Red = unhealthy/down

```tsx
const statusColors = {
  healthy: 'success',
  degraded: 'warning',
  unhealthy: 'danger',
}

<Badge variant={statusColors[service.status]} size="sm">
  {service.status}
</Badge>
```

## Chart Implementation Details

### Charting Library: Recharts

Already used in MSP detail page (`mission-control/msps/[id]/page.tsx`).

**Import:**
```typescript
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
```

### Area Chart Pattern (from MSP detail)

```tsx
<Card variant="glass" padding="md">
  <h3 className="text-sm font-medium text-space-700 dark:text-space-300 mb-4">Query Volume</h3>
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => formatNumber(value)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Area
          type="monotone"
          dataKey="queries"
          stroke="#9333ea"
          strokeWidth={2}
          fill="url(#queryGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</Card>
```

### Multi-Series Chart (Component Breakdown)

For breakdown by DNS component, use multiple `<Area>` elements with different colors:

```tsx
const componentColors = {
  'policy-svc': '#9333ea',  // purple
  'dnsdist': '#3b82f6',     // blue
  'unbound': '#22c55e',     // green
}

{Object.entries(componentColors).map(([component, color]) => (
  <Area
    key={component}
    type="monotone"
    dataKey={component}
    stroke={color}
    fill={color}
    fillOpacity={0.3}
  />
))}
```

## Auto-Refresh Approach

### SWR refreshInterval

```typescript
// Auto-refresh every 30 seconds
const { data, mutate } = useSWR(endpoint, adminFetcher, {
  ...defaultConfig,
  refreshInterval: isPaused ? 0 : 30000,
})
```

### Pause on Hover Pattern

```tsx
const [isPaused, setIsPaused] = useState(false)

// On chart container
<div
  onMouseEnter={() => setIsPaused(true)}
  onMouseLeave={() => setIsPaused(false)}
>
  {/* Chart content */}
</div>

// In SWR hook
refreshInterval: isPaused ? 0 : 30000
```

### Manual Refresh Button

```tsx
<button
  onClick={() => mutate()}
  className="px-3 py-1.5 text-sm ..."
>
  <ArrowPathIcon className="h-4 w-4 mr-1.5" />
  Refresh
</button>
```

### Auto-Pause Toggle

```tsx
const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

// Toggle button
<button
  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
  className={clsx('...', autoRefreshEnabled ? 'bg-primary-600' : 'bg-space-600')}
>
  {autoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
</button>

// In hook
refreshInterval: autoRefreshEnabled && !isPaused ? 30000 : 0
```

### Last Updated Timestamp

```tsx
const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

// Update on data change
useEffect(() => {
  if (data) setLastUpdated(new Date())
}, [data])

// Display
<span className="text-xs text-space-500">
  Last updated: {lastUpdated?.toLocaleTimeString()}
</span>
```

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `ui/src/app/mission-control/health/page.tsx` | Main system health page |
| `ui/src/components/mission-control/ServiceStatusCard.tsx` | Service status card component |
| `ui/src/components/mission-control/ErrorRateGauge.tsx` | Error rate percentage gauge |
| `ui/src/components/mission-control/RecentErrorsList.tsx` | Collapsible error cards |
| `ui/src/components/mission-control/QueryVolumeChart.tsx` | Area chart for query volume |

### Files to Modify

| File | Changes |
|------|---------|
| `ui/src/hooks/useAdminApi.ts` | Add `useAdminSystemHealth`, `useAdminRecentErrors` hooks |
| `ui/src/components/mission-control/AdminHeader.tsx` | Add "Health" navigation link (if not in sidebar) |

### Types to Add (in useAdminApi.ts)

```typescript
// System Health Types
export interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs?: number
  error?: string
  lastChecked: string
}

export interface StorageStatus {
  clickhouse: { connected: boolean; latencyMs?: number; consecutiveFailures: number; error?: string }
  redis: { connected: boolean; latencyMs?: number; error?: string }
}

export interface ErrorRates {
  lastHour: { errorCount: number; totalQueries: number; errorRate: number }
  last24Hours: { errorCount: number; totalQueries: number; errorRate: number }
  isMockData: boolean
}

export interface QueryVolume {
  totalQueries: number
  blockedQueries: number
  allowedQueries: number
  period: '1h' | '24h'
  isMockData: boolean
}

export interface SystemHealthResponse {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  services: ServiceStatus[]
  storage: StorageStatus
  errorRates: ErrorRates
  queryVolume: QueryVolume
  timestamp: string
}

export interface RecentError {
  timestamp: string
  domain: string
  reason: string
  clientIp: string
  tenantId: string
}
```

## Key Implementation Notes

### Service Status Card Design

Per CONTEXT.md decisions:
- Card grid layout with icon, name, status indicator
- Traffic light colors (green/yellow/red)
- Show status + uptime percentage (derive from error rates or latency)

```tsx
// Card with status indicator
<Card variant="glass" padding="md" className="relative">
  {/* Status indicator dot */}
  <div className={clsx(
    'absolute top-4 right-4 h-3 w-3 rounded-full',
    status === 'healthy' && 'bg-success-500',
    status === 'degraded' && 'bg-warning-500',
    status === 'unhealthy' && 'bg-danger-500',
  )} />

  <div className="flex items-center gap-3">
    <ServiceIcon className="h-8 w-8 text-space-400" />
    <div>
      <p className="font-medium text-space-900 dark:text-white">{name}</p>
      <Badge variant={statusColors[status]} size="sm">{status}</Badge>
    </div>
  </div>

  {latencyMs && (
    <p className="mt-2 text-xs text-space-500">{latencyMs}ms latency</p>
  )}
</Card>
```

### Error Rate Gauge

For percentage gauge visualization (per CONTEXT.md: "Error rate displayed as percentage gauge"):

```tsx
// Use ProgressRing from Charts.tsx or create simple gauge
import { ProgressRing } from '@/components/Charts'

<ProgressRing
  value={errorRates.last24Hours.errorRate}
  max={1}
  size={80}
  color={errorRates.last24Hours.errorRate > 0.05 ? '#ef4444' : '#22c55e'}
  label="Error Rate"
/>
```

### Collapsible Error Cards

Per CONTEXT.md: "Recent errors as collapsible cards - each error expandable with summary/details"

```tsx
const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())

{errors.map((error) => (
  <div
    key={`${error.timestamp}-${error.domain}`}
    className="border border-space-200 dark:border-space-700 rounded-lg"
  >
    {/* Summary row - always visible */}
    <button
      onClick={() => toggleExpand(error)}
      className="w-full flex items-center justify-between p-3"
    >
      <div className="flex items-center gap-3">
        <SeverityIcon severity={getSeverity(error.reason)} />
        <span className="font-medium">{error.domain}</span>
      </div>
      <ChevronDownIcon className={clsx(
        'h-4 w-4 transition-transform',
        isExpanded && 'rotate-180'
      )} />
    </button>

    {/* Details - shown when expanded */}
    {isExpanded && (
      <div className="px-3 pb-3 border-t border-space-200 dark:border-space-700">
        <dl className="text-sm space-y-1 mt-2">
          <div><dt>Reason:</dt><dd>{error.reason}</dd></div>
          <div><dt>Client IP:</dt><dd>{error.clientIp}</dd></div>
          <div><dt>Tenant:</dt><dd>{error.tenantId.slice(0,8)}...</dd></div>
        </dl>
      </div>
    )}
  </div>
))}
```

### Time Range Toggle

Per CONTEXT.md: "Time range toggle: 24h / 7d"

Note: Backend only supports `1h` and `24h`. For 7d, need to either:
1. Extend backend to support `7d` period
2. Use `24h` and note limitation in UI

```tsx
const [period, setPeriod] = useState<'24h' | '7d'>('24h')

// Period toggle (same pattern as MSP detail page)
<div className="flex gap-1 p-1 bg-space-100 dark:bg-space-800 rounded-lg">
  {(['24h', '7d'] as const).map((p) => (
    <button
      key={p}
      onClick={() => setPeriod(p)}
      className={clsx(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        period === p
          ? 'bg-white dark:bg-space-700 text-space-900 dark:text-white shadow-sm'
          : 'text-space-600 dark:text-space-400 hover:text-space-900'
      )}
    >
      {p}
    </button>
  ))}
</div>
```

### Stats Row Above Chart

Per CONTEXT.md: "Stats row above chart: total queries, peak, average for period"

```tsx
<div className="grid grid-cols-3 gap-4 mb-4">
  <div className="text-center">
    <p className="text-xs text-space-500">Total Queries</p>
    <p className="text-xl font-bold text-space-900 dark:text-white">
      {formatNumber(queryVolume.totalQueries)}
    </p>
  </div>
  <div className="text-center">
    <p className="text-xs text-space-500">Peak</p>
    <p className="text-xl font-bold text-space-900 dark:text-white">
      {formatNumber(peakQueries)}
    </p>
  </div>
  <div className="text-center">
    <p className="text-xs text-space-500">Average</p>
    <p className="text-xl font-bold text-space-900 dark:text-white">
      {formatNumber(avgQueries)}/hr
    </p>
  </div>
</div>
```

## State of the Art

| Pattern | Status | Implementation |
|---------|--------|----------------|
| SWR refreshInterval | Used | See useApi.ts patterns |
| Recharts for charts | Used | MSP detail page |
| Card-based layouts | Used | Billing page, MSP pages |
| Traffic light status | Standard | Badge component variants |
| Collapsible cards | Common | Use Headless UI Disclosure or manual state |

## Open Questions

1. **7-day period support:** Backend only supports 1h and 24h. Need to decide:
   - Extend backend to support 7d
   - Or adjust UI to match backend (24h only for volume)
   - RECOMMENDATION: Update backend to add 7d support, or show 24h only for now

2. **Component breakdown in chart:** Backend returns aggregate query volume, not per-component. For breakdown:
   - Would need backend changes to return per-service query counts
   - Or use service latency/health as proxy visualization
   - RECOMMENDATION: Use aggregate for now, note as future enhancement

3. **Uptime percentage:** Backend returns last-checked latency but not historical uptime. Options:
   - Calculate from health check history (would need backend change)
   - Show "Uptime: N/A" or just omit
   - RECOMMENDATION: Show latency and last-checked time instead of uptime percentage

## Sources

### Primary (HIGH confidence)
- `api/src/modules/admin/admin-health.service.ts` - Backend health service implementation
- `api/src/modules/admin/admin.controller.ts` - Admin controller with health endpoints
- `api/src/modules/admin/dto/system-health.dto.ts` - Response DTOs
- `ui/src/hooks/useAdminApi.ts` - Admin SWR hooks pattern
- `ui/src/app/mission-control/msps/[id]/page.tsx` - Chart and card patterns
- `ui/src/app/mission-control/tenants/[id]/billing/page.tsx` - Admin page structure

### Secondary (MEDIUM confidence)
- `ui/src/hooks/useApi.ts` - refreshInterval patterns
- `ui/src/components/ui/Card.tsx` - Card component API
- `ui/src/components/Charts.tsx` - ProgressRing and gauge patterns

## Metadata

**Confidence breakdown:**
- Backend endpoints: HIGH - Direct code inspection
- UI patterns: HIGH - Existing Mission Control pages
- Auto-refresh: HIGH - SWR documented patterns
- Chart implementation: HIGH - Recharts in codebase

**Research date:** 2026-01-19
**Valid until:** 30 days (stable patterns)
