# Phase 12: MSP Detail UI - Research

**Researched:** 2026-01-18
**Domain:** Admin UI / Mission Control / MSP Detail View
**Confidence:** HIGH

## Summary

This phase builds the MSP detail page for Mission Control at `/mission-control/msps/[id]`. The backend APIs already exist (`GET /admin/msp/tenants/:mspId` for MSP detail and `GET /admin/msp/tenants/:mspId/clients` for client listing). The UI follows patterns established in Phase 11 (MSP listing page) and existing dashboard components.

The codebase already has:
- MSP listing page at `/mission-control/msps` with navigation to detail pages
- Admin API hooks in `ui/src/hooks/useAdminApi.ts` (adminFetcher pattern)
- Recharts library for line/area charts (already installed)
- StatCard component for dashboard-style stat cards
- Breadcrumb component in DashboardLayout
- Table patterns from MSP listing page
- Action menu patterns with click-outside handling

**Primary recommendation:** Create the detail page at `/mission-control/msps/[id]/page.tsx` using existing UI components, add new hooks for MSP detail and client listing to `useAdminApi.ts`, and implement usage charts with Recharts (already available).

## API Integration

### MSP Detail Endpoint

**Endpoint:** `GET /admin/msp/tenants/:mspId`
**Auth:** AdminAuthGuard (Bearer token from `admin_token` localStorage key)

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | enum | 30d | Usage metrics period: '24h', '7d', '30d', '90d' |

**Response Schema (MspDetailResponseDto):**
```typescript
interface MspDetailResponse {
  id: string                    // UUID
  name: string                  // MSP name
  status: 'active' | 'suspended' | 'cancelled'
  contactEmail?: string         // Optional contact email
  tier: 'msp'                   // Always 'msp' for this endpoint
  clientCount: number           // Number of managed clients
  locationCount: number         // Total locations across clients
  userCount: number             // Total users across clients
  createdAt: string             // ISO date string
  usage: {
    totalQueries: number        // Total queries in period
    blockedQueries: number      // Blocked queries in period
    threatsBlocked: number      // Threats blocked in period
    blockRate: number           // Block rate percentage
    periodStart: string         // ISO date
    periodEnd: string           // ISO date
    isMockData: boolean         // Whether using mock data
  }
}
```

### MSP Client List Endpoint

**Endpoint:** `GET /admin/msp/tenants/:mspId/clients`
**Auth:** AdminAuthGuard

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| q | string | - | Search by client name (min 2 chars) |
| status | enum | - | Filter: 'active', 'suspended', 'cancelled' |
| limit | number | 20 | Results per page (1-100) |
| cursor | string | - | Pagination cursor |
| period | enum | 30d | Usage metrics period |

**Response Schema (MspClientListResponseDto):**
```typescript
interface MspClientListResponse {
  data: MspClient[]
  pagination: {
    cursor: string | null
    hasMore: boolean
    total: number
  }
}

interface MspClient {
  id: string                    // UUID
  name: string                  // Client organization name
  status: 'active' | 'suspended' | 'cancelled'
  tier: 'home' | 'enterprise' | 'msp'
  contactEmail?: string
  locationCount: number
  userCount: number
  totalQueries: number          // Queries in period
  blockedQueries: number        // Blocked in period
  createdAt: string
}
```

### Impersonation Endpoint

**Endpoint:** `POST /admin/impersonate/:tenantId`
**Response:** Returns impersonation token for tenant dashboard access
```typescript
interface StartImpersonationResponse {
  accessToken: string           // Tenant-scoped JWT
  tenantId: string              // Target tenant UUID
  tenantName: string            // Display name
  tenantTier: 'home' | 'enterprise' | 'msp'
  expiresIn: number             // Seconds (3600 = 1 hour)
}
```

### Billing Page Navigation

Per CONTEXT.md: "View Billing" button navigates to billing page for tenant.
**Target:** `/mission-control/tenants/:tenantId/billing` (future phase) OR use impersonation to `/dashboard/billing`

**Recommendation:** For Phase 12, "View Billing" should navigate to `/mission-control/msps/:mspId/billing` as a placeholder page, or use a toast indicating "Billing view coming soon" until the billing detail phase is implemented.

## UI Patterns

### Existing Admin Page Structure

From Phase 11 MSP listing (`/mission-control/msps/page.tsx`):
```tsx
<div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
  {/* Page Header */}
  <div className="sm:flex sm:items-center sm:justify-between">
    <div>
      <h1 className="text-3xl font-bold text-space-900 dark:text-white">Title</h1>
      <p className="mt-2 text-space-500 dark:text-space-400">Subtitle</p>
    </div>
    {/* Action buttons */}
  </div>
  {/* Content */}
</div>
```

### Breadcrumb Pattern (from DashboardLayout)

Existing Breadcrumbs component automatically generates from pathname:
```tsx
// Mission Control > MSPs > [MSP Name]
// Automatic based on route /mission-control/msps/[id]
```

**Enhancement needed:** The existing Breadcrumbs shows segment labels from a static map. For MSP detail, we need to show the MSP name instead of the ID. Options:
1. Add MSP name to URL state (not recommended - stale data)
2. Create custom breadcrumb component for detail page
3. Use separate "Back" link alongside auto-breadcrumbs

**Recommendation:** Per CONTEXT.md, use BOTH breadcrumbs AND back button:
```tsx
{/* Back link */}
<Link href="/mission-control/msps" className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm mb-4">
  <ArrowLeftIcon className="h-4 w-4" />
  Back to MSPs
</Link>

{/* Custom breadcrumb showing MSP name */}
<nav className="flex items-center gap-2 text-sm mb-4">
  <Link href="/mission-control">Mission Control</Link>
  <span>/</span>
  <Link href="/mission-control/msps">MSPs</Link>
  <span>/</span>
  <span className="font-medium">{mspData.name}</span>
</nav>
```

### StatCard Pattern

From `ui/src/components/ui/Card.tsx`:
```tsx
<StatCard
  title="Clients"
  value="15"
  icon={<BuildingOffice2Icon className="h-5 w-5" />}
  variant="primary"
/>
```

**For MSP detail page stat cards grid:**
```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard title="MSP Name" value={msp.name} icon={...} />
  <StatCard title="Tier" value="MSP" icon={...} variant="primary" />
  <StatCard title="Status" value={msp.status} icon={...} variant={statusVariant} />
  <StatCard title="Created" value={formatDate(msp.createdAt)} icon={...} />
</div>
```

**Note:** StatCard is designed for metrics with numeric values. For text-heavy info (name, tier), consider custom info cards or adapting the existing pattern.

### Table Pattern (from MSP listing)

Compact table with dense rows per CONTEXT.md:
```tsx
<Card variant="solid" padding="none">
  <div className="table-container">
    <table className="table">
      <thead className="table-header">
        <tr>
          <th className="table-header-cell">Client Name</th>
          <th className="table-header-cell">Status</th>
          <th className="table-header-cell">Locations</th>
          <th className="table-header-cell">Queries (24h)</th>
          <th className="table-header-cell">Blocked %</th>
          <th className="table-header-cell text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="table-body">
        {/* Rows with action menu */}
      </tbody>
    </table>
  </div>
</Card>
```

### Chart Patterns (Recharts)

From `ui/src/components/billing/UsageChart.tsx` and `QueryTrendsChart.tsx`:
```tsx
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Line chart for query volume
<ResponsiveContainer width="100%" height={320}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" className="stroke-space-200 dark:stroke-space-700" />
    <XAxis dataKey="date" className="text-xs" stroke="currentColor" />
    <YAxis className="text-xs" stroke="currentColor" />
    <Tooltip content={<CustomTooltip />} />
    <Legend />
    <Line type="monotone" dataKey="queries" stroke="#9333ea" strokeWidth={2} />
    <Line type="monotone" dataKey="blocked" stroke="#ef4444" strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>
```

### Period Toggle Pattern

From reports page - button group for time period selection:
```tsx
const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d')

<div className="flex gap-2">
  {['24h', '7d', '30d'].map((p) => (
    <button
      key={p}
      onClick={() => setPeriod(p as any)}
      className={clsx(
        'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
        period === p
          ? 'bg-primary-500 text-white'
          : 'bg-space-100 dark:bg-space-800 text-space-600 dark:text-space-400 hover:bg-space-200 dark:hover:bg-space-700'
      )}
    >
      {p}
    </button>
  ))}
</div>
```

### Action Menu Pattern (from MSP listing)

Row-level action menu with click-outside handling:
```tsx
const [activeMenu, setActiveMenu] = useState<string | null>(null)
const menuRef = useRef<HTMLDivElement>(null)

// Click outside handler
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setActiveMenu(null)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])

// In table row
<td onClick={(e) => e.stopPropagation()}>
  <div className="relative" ref={activeMenu === client.id ? menuRef : null}>
    <button onClick={() => setActiveMenu(activeMenu === client.id ? null : client.id)}>
      <EllipsisVerticalIcon className="h-5 w-5" />
    </button>
    {activeMenu === client.id && (
      <div className="absolute right-0 top-10 z-10 w-48 bg-white dark:bg-space-800 rounded-xl shadow-xl ...">
        <button>View Details</button>
        <button>Impersonate</button>
        <button>Go to Billing</button>
      </div>
    )}
  </div>
</td>
```

## Implementation Approach

### Recommended File Structure

**New files to create:**
```
ui/src/
  app/
    mission-control/
      msps/
        [id]/
          page.tsx             # MSP detail page
  hooks/
    useAdminApi.ts             # UPDATE: Add MSP detail and client hooks
```

### Component Architecture

**Page Component (`mission-control/msps/[id]/page.tsx`):**
```tsx
export default function MspDetailPage({ params }: { params: { id: string } }) {
  const { id: mspId } = params
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d')
  const [clientSearch, setClientSearch] = useState('')
  const [clientStatus, setClientStatus] = useState('')

  const { data: mspData, isLoading, error } = useAdminMspDetail(mspId, { period })
  const { data: clientsData } = useAdminMspClients(mspId, { q: clientSearch, status: clientStatus, period })

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back link + Breadcrumbs */}
      {/* Hero: Stat cards + Action buttons */}
      {/* Two-column layout: Clients table | Usage charts */}
    </div>
  )
}
```

### Data Fetching Hooks (add to useAdminApi.ts)

```typescript
// MSP Detail Response Types
export interface MspUsageMetrics {
  totalQueries: number
  blockedQueries: number
  threatsBlocked: number
  blockRate: number
  periodStart: string
  periodEnd: string
  isMockData: boolean
}

export interface MspDetailResponse {
  id: string
  name: string
  status: 'active' | 'suspended' | 'cancelled'
  contactEmail?: string
  tier: 'msp'
  clientCount: number
  locationCount: number
  userCount: number
  createdAt: string
  usage: MspUsageMetrics
}

export function useAdminMspDetail(mspId: string, params?: { period?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set('period', params.period)
  const query = searchParams.toString()
  const endpoint = `/admin/msp/tenants/${mspId}${query ? `?${query}` : ''}`

  return useSWR<MspDetailResponse>(endpoint, adminFetcher, defaultConfig)
}

// MSP Client Types
export interface MspClient {
  id: string
  name: string
  status: 'active' | 'suspended' | 'cancelled'
  tier: 'home' | 'enterprise' | 'msp'
  contactEmail?: string
  locationCount: number
  userCount: number
  totalQueries: number
  blockedQueries: number
  createdAt: string
}

export interface MspClientListResponse {
  data: MspClient[]
  pagination: {
    cursor: string | null
    hasMore: boolean
    total: number
  }
}

export function useAdminMspClients(mspId: string, params?: {
  q?: string
  status?: string
  limit?: number
  cursor?: string
  period?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.q) searchParams.set('q', params.q)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  if (params?.period) searchParams.set('period', params.period)
  const query = searchParams.toString()
  const endpoint = `/admin/msp/tenants/${mspId}/clients${query ? `?${query}` : ''}`

  return useSWR<MspClientListResponse>(endpoint, adminFetcher, defaultConfig)
}

// Impersonation function
export async function startImpersonation(tenantId: string): Promise<StartImpersonationResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/impersonate/${tenantId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Impersonation failed' }))
    throw new Error(error.message)
  }

  return res.json()
}
```

### Layout Structure (per CONTEXT.md)

```
+------------------------------------------------------------------+
| Back to MSPs                                                      |
| Mission Control > MSPs > [MSP Name]                              |
+------------------------------------------------------------------+
|                                                                  |
| +--------+ +--------+ +--------+ +--------+  [View Billing]      |
| | Name   | | Tier   | | Status | | Created|  [Impersonate]       |
| | Acme   | | MSP    | | Active | | Jan 15 |                      |
| +--------+ +--------+ +--------+ +--------+                      |
|                                                                  |
+------------------------------------------------------------------+
|                              |                                   |
| Clients (15 total)           |  Usage Charts                     |
| [Search...] [Status filter]  |  [24h] [7d] [30d]                 |
|                              |                                   |
| +-------------------------+  |  +---------------------------+    |
| | Name | Status | Locs |  |  |  |  Query Volume Over Time   |    |
| | ...  | ...    | ...  |  |  |  |  [Line chart]             |    |
| | ...  | ...    | ...  |  |  |  +---------------------------+    |
| +-------------------------+  |                                   |
|                              |  +---------------------------+    |
|                              |  |  Blocked vs Allowed       |    |
|                              |  |  [Stacked line chart]     |    |
|                              |  +---------------------------+    |
|                              |                                   |
+------------------------------------------------------------------+
```

### Key Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Chart library | Recharts (already installed) | Consistent with existing charts |
| Default period | 7 days | Matches CONTEXT.md specification |
| Client table | Pagination (not infinite scroll) | Simpler for secondary list |
| Action buttons placement | Hero area with stat cards | Per CONTEXT.md |
| Impersonation flow | Navigate to `/dashboard` with token | Per CONTEXT.md - no confirmation |
| Billing button | Placeholder toast | Full billing not in this phase |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Charts | Custom SVG | Recharts | Already installed, tested, responsive |
| Tables | Custom grid | table + .table-* classes | Existing pattern from Phase 11 |
| Stat display | Custom cards | StatCard component | Already available, styled |
| Action menu | Custom dropdown | Existing pattern | Click-outside handling proven |
| Loading states | Custom spinners | SkeletonTable, skeleton class | Existing components |
| Data fetching | fetch + useState | SWR + adminFetcher | Caching, revalidation built-in |

## Common Pitfalls

### Pitfall 1: Using tenant token instead of admin token
**What goes wrong:** API calls fail with 401 because adminFetcher uses `admin_token` localStorage key
**Why it happens:** Copy-paste from tenant dashboard code
**How to avoid:** Always use `useAdminMspDetail` and `useAdminMspClients` hooks that use `adminFetcher`
**Warning signs:** 401 errors in network tab, "authentication required" messages

### Pitfall 2: Not handling loading/error states
**What goes wrong:** Page crashes or shows stale data
**Why it happens:** SWR returns undefined before data loads
**How to avoid:** Always check `isLoading` and `error` before rendering data
**Warning signs:** "Cannot read property of undefined" errors

### Pitfall 3: Chart data not updating with period change
**What goes wrong:** Charts show stale data when period toggle changes
**Why it happens:** SWR key doesn't include period parameter
**How to avoid:** Include period in the SWR key (endpoint URL)
**Warning signs:** Chart doesn't change when clicking period buttons

### Pitfall 4: Impersonation token handling
**What goes wrong:** Admin gets stuck in impersonation mode
**Why it happens:** Impersonation token stored incorrectly
**How to avoid:** Store impersonation token in separate key (`impersonation_token`), redirect to `/dashboard`
**Warning signs:** After impersonation, can't access Mission Control

### Pitfall 5: Client list search not debounced
**What goes wrong:** API called on every keystroke, poor performance
**Why it happens:** Direct binding of search input to API parameter
**How to avoid:** Use debounced search pattern (300ms) from Phase 11
**Warning signs:** Network tab shows many rapid API calls while typing

## Code Examples

### Period Toggle Component
```tsx
// Source: Adapted from reports page pattern
interface PeriodToggleProps {
  period: '24h' | '7d' | '30d'
  onChange: (period: '24h' | '7d' | '30d') => void
}

function PeriodToggle({ period, onChange }: PeriodToggleProps) {
  const periods = ['24h', '7d', '30d'] as const

  return (
    <div className="flex gap-1 p-1 bg-space-100 dark:bg-space-800 rounded-lg">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            period === p
              ? 'bg-white dark:bg-space-700 text-space-900 dark:text-white shadow-sm'
              : 'text-space-600 dark:text-space-400 hover:text-space-900 dark:hover:text-white'
          )}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
```

### Usage Line Chart
```tsx
// Source: Adapted from UsageChart.tsx and QueryTrendsChart.tsx
interface UsageChartProps {
  data: { date: string; queries: number; blocked: number }[]
  isLoading?: boolean
}

function MspUsageChart({ data, isLoading }: UsageChartProps) {
  if (isLoading) {
    return <div className="h-80 skeleton rounded-xl" />
  }

  return (
    <Card variant="glass" padding="md">
      <CardHeader title="Query Volume" subtitle="Queries over time" />
      <div className="h-72 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="queriesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-space-200 dark:stroke-space-700" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="queries" name="Total" stroke="#9333ea" strokeWidth={2} fill="url(#queriesGradient)" />
            <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#ef4444" strokeWidth={2} fill="url(#blockedGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
```

### Impersonation Handler
```tsx
// Source: Adapted from admin-api.ts pattern
const handleImpersonate = async (tenantId: string) => {
  try {
    const result = await startImpersonation(tenantId)

    // Store impersonation token and info
    localStorage.setItem('impersonation_token', result.accessToken)
    localStorage.setItem('impersonation_info', JSON.stringify({
      tenantId: result.tenantId,
      tenantName: result.tenantName,
      tenantTier: result.tenantTier,
      startedAt: new Date().toISOString(),
    }))

    // Store as regular tenant token for dashboard
    localStorage.setItem('token', result.accessToken)

    // Navigate to tenant dashboard
    window.location.href = '/dashboard'
  } catch (error) {
    showToast('error', error instanceof Error ? error.message : 'Impersonation failed')
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SVG charts | Recharts library | Already in use | Consistent, responsive charts |
| Manual fetch | SWR with adminFetcher | Phase 11 | Caching, deduplication |
| Inline styles | Tailwind + CSS variables | Already in use | Dark mode, consistency |

**Current patterns from Phase 11:**
- IntersectionObserver for infinite scroll
- URL state sync with router.replace
- Action menu with click-outside handling
- adminFetcher with admin_token

## Open Questions

1. **Billing button destination**
   - What we know: "View Billing" should navigate somewhere
   - What's unclear: Billing detail page doesn't exist yet
   - Recommendation: Show toast "Billing details coming soon" or navigate to placeholder

2. **Usage chart time series data**
   - What we know: API returns aggregate metrics (totalQueries, blockedQueries)
   - What's unclear: Is there an endpoint for time series data?
   - Recommendation: If no time series endpoint, show aggregate stats instead of charts, or mock time series from aggregate

3. **Client detail navigation**
   - What we know: Row click shows action menu
   - What's unclear: "View Details" - what page does it go to?
   - Recommendation: Navigate to `/mission-control/tenants/:clientId` (placeholder until tenant detail exists)

## Sources

### Primary (HIGH confidence)
- `/api/src/modules/admin/admin.controller.ts` - Backend endpoint definitions
- `/api/src/modules/admin/dto/msp-detail.dto.ts` - MSP detail response schema
- `/api/src/modules/admin/dto/impersonation.dto.ts` - Impersonation response schema
- `/ui/src/app/mission-control/msps/page.tsx` - MSP listing page patterns
- `/ui/src/hooks/useAdminApi.ts` - Admin API hook patterns
- `/ui/src/components/billing/UsageChart.tsx` - Recharts implementation
- `/ui/src/components/dashboard/QueryTrendsChart.tsx` - Area chart pattern
- `/ui/src/components/ui/Card.tsx` - StatCard component

### Supporting (HIGH confidence)
- `/ui/package.json` - Recharts 3.6.0 available
- `/ui/src/components/layout/DashboardLayout.tsx` - Breadcrumb pattern
- `/ui/src/contexts/AdminAuthContext.tsx` - Admin auth and token handling
- `/ui/src/lib/admin-api.ts` - Admin API helper functions

## Metadata

**Confidence breakdown:**
- API Integration: HIGH - Verified from DTOs and controller
- UI Patterns: HIGH - Verified from Phase 11 and existing components
- Chart Implementation: HIGH - Recharts already in use
- Impersonation Flow: HIGH - Endpoint and response documented

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (stable patterns established in Phase 11)
