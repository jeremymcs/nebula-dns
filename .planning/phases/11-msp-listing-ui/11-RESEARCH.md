# Phase 11: MSP Listing UI - Research

**Researched:** 2026-01-18
**Domain:** Admin UI / Mission Control / Data Listing
**Confidence:** HIGH

## Summary

This phase builds an MSP listing page for Mission Control (admin portal). The backend API already exists (`GET /admin/msp/tenants`) with cursor-based pagination, search, and status filtering. The UI follows established patterns from the existing codebase.

The codebase already has:
- Mission Control layout (`/mission-control` route) with AdminAuthContext
- AdminHeader component with session management
- Admin API helpers in `ui/src/lib/admin-api.ts`
- Comprehensive UI component library (Button, Badge, Input, EmptyState, Skeleton, etc.)
- SWR-based data fetching patterns in `useApi.ts`
- Table patterns in users page, list patterns in ClientsList component

**Primary recommendation:** Create an admin fetcher utility and custom hook for MSP listing data, then build a new page at `/mission-control/msps` using existing UI components and patterns.

## API Integration

### MSP Listing Endpoint

**Endpoint:** `GET /admin/msp/tenants`
**Auth:** AdminAuthGuard (Bearer token from `admin_token` localStorage key)

**Request Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| q | string | - | Search by name, email, or UUID (min 2 chars) |
| status | enum | - | Filter: 'active', 'suspended', 'cancelled' |
| limit | number | 20 | Results per page (1-100) |
| cursor | string | - | Pagination cursor for next page |

**Response Schema (MspListingResponseDto):**
```typescript
interface MspListingResponse {
  data: MspTenant[]
  pagination: {
    cursor: string | null  // Next page cursor, null if no more
    hasMore: boolean       // Whether more results exist
    total: number          // Total MSP count
  }
}

interface MspTenant {
  id: string              // UUID
  name: string            // MSP name
  status: 'active' | 'suspended' | 'cancelled'
  clientCount: number     // Number of managed clients
  contactEmail?: string   // Optional contact email
}
```

**Note:** The DTO does not include tier, totalQueries, or createdAt fields requested in CONTEXT.md. These may need to be added to the backend API or retrieved via MSP detail endpoint.

### Impersonation Endpoint

**Endpoint:** `POST /admin/impersonate/:tenantId`
**Response:** Returns impersonation token to access tenant dashboard

### Admin API Helpers Pattern

Existing pattern from `ui/src/lib/admin-api.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Get token from admin-specific localStorage key
const token = localStorage.getItem('admin_token')

// All requests use Bearer token auth
const res = await fetch(`${API_URL}/admin/...`, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
})
```

**Recommendation:** Create a dedicated `adminFetcher` function for SWR that uses `admin_token` instead of `token`.

## UI Patterns

### Existing Admin Pages

Mission Control pages exist at:
- `/mission-control` - Main dashboard (MissionControlDashboard component)
- `/mission-control/login` - Admin login page

Layout pattern (`mission-control/layout.tsx`):
- Uses `AdminAuthProvider` for authentication
- Protected routes redirect to `/mission-control/login`
- `AdminHeader` component provides navigation and user menu
- Session expiry warning modal built-in

### Navigation Pattern

**Current:** AdminHeader only shows logo and user menu - no sidebar navigation.

**Recommendation:** MSP listing should be accessible from AdminHeader. Options:
1. Add "MSPs" link to AdminHeader navigation
2. Add it to the Mission Control main dashboard as a prominent card/button
3. Consider adding a simple navigation menu to AdminHeader for future admin pages

### Table/List Components

**No dedicated Table component exists.** Tables are built inline using these patterns:

**From users page:**
```tsx
<Card variant="solid" padding="none">
  <div className="table-container">
    <table className="table">
      <thead className="table-header">
        <tr>
          <th className="table-header-cell">Column</th>
        </tr>
      </thead>
      <tbody className="table-body">
        <tr className="table-row">
          <td className="table-cell">Content</td>
        </tr>
      </tbody>
    </table>
  </div>
</Card>
```

**From ClientsList component (card-based):**
```tsx
<div className="grid gap-4">
  {items.map((item) => (
    <div className="card hover:ring-2 hover:ring-primary-500/50 cursor-pointer">
      {/* Card content */}
    </div>
  ))}
</div>
```

### Row Action Menu Pattern

From `clients/[id]/users/page.tsx`:
```tsx
// State for active menu
const [activeMenu, setActiveMenu] = useState<string | null>(null)

// Three-dot button
<button
  onClick={() => setActiveMenu(activeMenu === id ? null : id)}
  className="p-2 rounded-lg hover:bg-space-100 dark:hover:bg-space-600 opacity-0 group-hover:opacity-100 transition-all"
>
  <EllipsisVerticalIcon className="h-5 w-5 text-space-500" />
</button>

// Dropdown menu
{activeMenu === id && (
  <div className="absolute right-0 top-10 z-10 w-40 bg-white dark:bg-space-800 rounded-xl shadow-xl ring-1 ring-space-200 dark:ring-space-700 py-1">
    <button className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-space-50 dark:hover:bg-space-700">
      <Icon className="h-4 w-4" />
      Action
    </button>
  </div>
)}
```

### Search/Filter Pattern

From users page:
```tsx
<div className="flex flex-col sm:flex-row gap-4 mb-6">
  {/* Search Input */}
  <div className="relative flex-1">
    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-space-400" />
    <input
      type="text"
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-space-800 border border-space-200 dark:border-space-700..."
    />
  </div>

  {/* Filter Dropdowns */}
  <select className="appearance-none pl-3 pr-8 py-2.5 rounded-xl...">
    <option value="">All Status</option>
    <option value="active">Active</option>
  </select>
</div>
```

### Loading States

**Skeleton pattern:**
```tsx
{isLoading && (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="skeleton h-16 rounded-xl" />
    ))}
  </div>
)}
```

Or use `SkeletonTable` from `ui/src/components/ui/Skeleton.tsx`:
```tsx
<SkeletonTable rows={5} cols={6} />
```

### Empty State Pattern

```tsx
<EmptyState
  icon={<BuildingOffice2Icon className="h-12 w-12" />}
  title="No MSPs found"
  description="Try adjusting your search or filters."
/>
```

## Implementation Approach

### Recommended File Structure

**New files to create:**
```
ui/src/
  hooks/
    useAdminApi.ts           # Admin-specific SWR hooks
  app/
    mission-control/
      msps/
        page.tsx             # MSP listing page
      msps/[id]/
        page.tsx             # MSP detail page (future phase)
  lib/
    admin-api.ts             # UPDATE: Add MSP-related functions
```

### Component Architecture

**Page Component (`mission-control/msps/page.tsx`):**
```tsx
export default function MspListingPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      {/* Search & Filter Bar */}
      {/* MSP Table with infinite scroll */}
    </div>
  )
}
```

**Recommended breakdown:**
1. `MspSearchBar` - Search input + status filter dropdown
2. `MspTable` - Table rendering with clickable rows and action menus
3. `MspRowActions` - Three-dot menu with View details, Impersonate options
4. Use `useIntersectionObserver` pattern for infinite scroll sentinel

### Infinite Scroll Implementation

**No existing infinite scroll in codebase.** Implement using IntersectionObserver:

```tsx
// Sentinel ref for bottom of list
const sentinelRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore()
      }
    },
    { threshold: 0.1 }
  )

  if (sentinelRef.current) {
    observer.observe(sentinelRef.current)
  }

  return () => observer.disconnect()
}, [hasMore, loading])

// At bottom of list
<div ref={sentinelRef} className="h-4" />
```

### Key Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Batch size | 25 items | Balance between load time and scroll frequency |
| Debounce timing | 300ms | Standard UX, prevents excessive API calls |
| URL persistence | Yes (search, status params) | Allows sharing/bookmarking filtered views |
| Loading style | Skeleton rows | Consistent with existing patterns |
| Error presentation | Toast notification | Consistent with useToast pattern in codebase |

### Data Fetching Pattern

Create admin-specific SWR hook:

```typescript
// hooks/useAdminApi.ts
const ADMIN_TOKEN_KEY = 'admin_token'

const adminFetcher = async <T>(endpoint: string): Promise<T> => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem(ADMIN_TOKEN_KEY)
    : null

  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message)
  }

  return res.json()
}

export function useAdminMspList(params: {
  q?: string
  status?: string
  limit?: number
  cursor?: string
}) {
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.set('q', params.q)
  if (params.status) searchParams.set('status', params.status)
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.cursor) searchParams.set('cursor', params.cursor)

  const query = searchParams.toString()
  return useSWR<MspListingResponse>(
    `/admin/msp/tenants${query ? `?${query}` : ''}`,
    adminFetcher
  )
}
```

## Dependencies

### Required (already in package.json)
- `swr` - Data fetching with caching
- `@heroicons/react` - Icons
- `@headlessui/react` - Accessible dropdown menus (if using Menu component)
- `clsx` - Class name utilities
- `date-fns` - Date formatting

### Optional (no new packages needed)
- IntersectionObserver is a native browser API
- URL state management via Next.js `useSearchParams`

## Risks/Considerations

### API Data Gap
The current `MspTenantDto` only includes: id, name, status, clientCount, contactEmail.
CONTEXT.md requests additional columns: tier, totalQueries, createdAt.

**Options:**
1. Update backend DTO to include these fields (requires Phase 4 modification)
2. Use only available fields for Phase 11, add others in future phase
3. Fetch MSP detail for each row (not recommended - N+1 problem)

**Recommendation:** Proceed with available fields. Note the gap for future backend enhancement.

### Row Navigation + Action Menu Conflict
CONTEXT.md specifies both clickable rows AND action menu. Need to handle:
- Row click navigates to detail page
- Action menu click should NOT navigate (stopPropagation)

```tsx
<tr onClick={() => router.push(`/mission-control/msps/${msp.id}`)} className="cursor-pointer">
  <td>...</td>
  <td onClick={(e) => e.stopPropagation()}>
    {/* Action menu */}
  </td>
</tr>
```

### Admin Token vs Tenant Token
- Admin pages use `admin_token` localStorage key
- Regular dashboard uses `token` key
- Must use correct key for admin API calls

### Click-Outside Handling for Action Menu
Need to close dropdown when clicking outside. Pattern exists in MissionControlSidebar:
```tsx
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setShowMenu(false)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])
```

## Sources

### Primary (HIGH confidence)
- `/api/src/modules/admin/admin.controller.ts` - Backend endpoint definitions
- `/api/src/modules/admin/dto/msp-listing.dto.ts` - Response schema
- `/ui/src/contexts/AdminAuthContext.tsx` - Admin auth pattern
- `/ui/src/lib/admin-api.ts` - Admin API helper pattern
- `/ui/src/app/mission-control/layout.tsx` - Mission Control layout
- `/ui/src/app/dashboard/users/page.tsx` - Table + search/filter pattern
- `/ui/src/components/msp/ClientsList.tsx` - Card-based list pattern
- `/ui/src/hooks/useApi.ts` - SWR data fetching patterns

### Supporting (HIGH confidence)
- `/ui/src/components/ui/` - UI component library
- `/ui/package.json` - Available dependencies

## Metadata

**Confidence breakdown:**
- API Integration: HIGH - Verified from DTOs and controller
- UI Patterns: HIGH - Verified from existing codebase
- Implementation Approach: HIGH - Based on established patterns

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (stable patterns)
