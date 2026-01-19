# Phase 13: Tenant Search & Impersonation UI - Research

**Researched:** 2026-01-19
**Domain:** React/Next.js Spotlight-style Search, Admin Impersonation Flow
**Confidence:** HIGH

## Summary

Phase 13 implements a global tenant search in the Mission Control admin header with Spotlight-style dropdown results, plus an impersonation banner and session management for viewing tenant dashboards. The existing codebase provides excellent foundation: Headless UI Combobox patterns (CommandBar), admin API hooks with SWR (useAdminApi.ts), impersonation API support (startImpersonation function), and admin auth context with separate token storage.

Key implementation approach:
1. **Search component:** Embed in AdminHeader using Headless UI Combobox with Popover-like positioning (no Dialog modal)
2. **Impersonation flow:** Store impersonation token in localStorage, redirect to /dashboard, show banner from DashboardLayout
3. **End impersonation:** Clear impersonation storage, redirect to /mission-control

**Primary recommendation:** Build TenantSearchDropdown as a self-contained component using existing Combobox patterns, create ImpersonationBanner for DashboardLayout, and add useDebounce hook plus useAdminTenantSearch SWR hook.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @headlessui/react | 2.x | Combobox component | Already used for CommandBar, provides keyboard nav and accessibility |
| swr | 2.x | Data fetching | Already used in useAdminApi.ts for admin hooks |
| clsx | 2.x | Conditional classNames | Already used throughout codebase |
| @heroicons/react | 2.x | Icons | Already used throughout codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| use-debounce | 10.x | Debounce hook | For 300ms search delay (or custom useDebounce) |
| framer-motion | 11.x | Animations | Already used in DashboardLayout for page transitions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Headless UI Combobox | Custom dropdown | Combobox provides accessibility out of box |
| Custom debounce | lodash.debounce | Custom hook is simpler, no extra dependency |
| SWR | React Query | Project already uses SWR consistently |

**Installation:**
```bash
# No new dependencies needed - all already installed
# Optional: npm install use-debounce (if not using custom hook)
```

## Architecture Patterns

### Recommended Project Structure
```
ui/src/
├── components/
│   ├── mission-control/
│   │   ├── AdminHeader.tsx           # Add TenantSearchDropdown
│   │   ├── TenantSearchDropdown.tsx  # NEW: Spotlight-style search
│   │   └── ...
│   └── banners/
│       ├── ImpersonationBanner.tsx   # NEW: Amber banner for impersonation
│       └── ...
├── hooks/
│   ├── useAdminApi.ts                # Add useAdminTenantSearch
│   ├── useDebounce.ts                # NEW: 300ms debounce hook
│   └── useImpersonation.ts           # NEW: Impersonation state management
└── lib/
    └── impersonation.ts              # NEW: Storage helpers for impersonation
```

### Pattern 1: Headless UI Combobox for Search Dropdown
**What:** Use Combobox with inline positioning (no Dialog) for Spotlight-style search
**When to use:** Search dropdowns that appear inline below an input
**Example:**
```typescript
// Source: Existing CommandBar.tsx pattern adapted for inline dropdown
import { Combobox, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect, useRef } from 'react'

export function TenantSearchDropdown() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const { data, isLoading } = useAdminTenantSearch(debouncedQuery)
  const [isOpen, setIsOpen] = useState(false)

  // Open dropdown when query length >= 2
  useEffect(() => {
    setIsOpen(debouncedQuery.length >= 2)
  }, [debouncedQuery])

  return (
    <Combobox onChange={handleSelect}>
      <div className="relative">
        <Combobox.Input
          onChange={(e) => setQuery(e.target.value)}
          displayValue={() => query}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search tenants..."
          className="..."
        />
        <Transition
          show={isOpen}
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Combobox.Options className="absolute mt-1 w-80 ...">
            {/* Results */}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  )
}
```

### Pattern 2: Custom Debounce Hook
**What:** Reusable hook for debouncing search queries
**When to use:** Any search input that calls an API
**Example:**
```typescript
// Source: Common React pattern
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
```

### Pattern 3: Impersonation State Storage
**What:** Separate localStorage keys for impersonation to preserve admin session
**When to use:** Admin impersonating tenant while keeping admin context
**Example:**
```typescript
// Source: Project pattern from Phase 12 SUMMARY + existing AuthContext
const IMPERSONATION_TOKEN = 'impersonation_token'
const IMPERSONATION_INFO = 'impersonation_info'
const ADMIN_TOKEN_KEY = 'admin_token' // preserved during impersonation

interface ImpersonationInfo {
  tenantId: string
  tenantName: string
  tenantTier: 'home' | 'enterprise' | 'msp'
  startedAt: string
}

export function storeImpersonation(
  token: string,
  info: Omit<ImpersonationInfo, 'startedAt'>
): void {
  localStorage.setItem(IMPERSONATION_TOKEN, token)
  localStorage.setItem(IMPERSONATION_INFO, JSON.stringify({
    ...info,
    startedAt: new Date().toISOString(),
  }))
  // Also set as main token so tenant dashboard reads it
  localStorage.setItem('token', token)
}

export function getImpersonationInfo(): ImpersonationInfo | null {
  const info = localStorage.getItem(IMPERSONATION_INFO)
  return info ? JSON.parse(info) : null
}

export function clearImpersonation(): void {
  localStorage.removeItem(IMPERSONATION_TOKEN)
  localStorage.removeItem(IMPERSONATION_INFO)
  localStorage.removeItem('token')
  // admin_token remains intact
}

export function isImpersonating(): boolean {
  return !!localStorage.getItem(IMPERSONATION_TOKEN)
}
```

### Pattern 4: Impersonation Banner in DashboardLayout
**What:** Persistent amber banner at top of screen during impersonation
**When to use:** All pages when admin is viewing as tenant
**Example:**
```typescript
// Source: Existing DashboardLayout pattern for banners
export function ImpersonationBanner() {
  const impersonationInfo = getImpersonationInfo()

  if (!impersonationInfo) return null

  const handleEndImpersonation = async () => {
    // Call API to end impersonation (blacklist token)
    try {
      await endImpersonationSession()
    } catch {
      // Continue with cleanup even if API fails
    }
    clearImpersonation()
    window.location.href = '/mission-control'
  }

  const tierLabel = impersonationInfo.tenantTier === 'msp'
    ? 'MSP'
    : impersonationInfo.tenantTier === 'enterprise'
      ? 'Business'
      : 'Home'

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
      <span className="text-sm font-medium flex items-center gap-2">
        <EyeIcon className="h-4 w-4" />
        Viewing as: {impersonationInfo.tenantName} ({tierLabel})
      </span>
      <button
        onClick={handleEndImpersonation}
        className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
      >
        End Impersonation
      </button>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Using Dialog for inline search:** Dialog steals focus and overlays entire screen - use Combobox with Transition for inline dropdown
- **Debouncing in component state:** Creates stale closures - use custom useDebounce hook
- **Overwriting admin_token during impersonation:** Loses admin session - use separate impersonation_token key
- **Fetching on every keystroke:** Wasteful API calls - debounce at 300ms minimum
- **Confirmation dialogs for direct actions:** Context specifies no confirmation for start/end impersonation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard navigation in dropdown | Custom keydown handlers | Headless UI Combobox | Full arrow key, Enter, Escape support built-in |
| Click outside to close | Custom event listeners | Headless UI handles this | Edge cases with portals, nested elements |
| Search result accessibility | Manual ARIA attributes | Combobox provides ARIA | Screen reader support is complex |
| Debounce implementation | setTimeout in useEffect | useDebounce hook | Proper cleanup, no memory leaks |
| Search API integration | Manual fetch + state | SWR with adminFetcher | Caching, error handling, loading states |

**Key insight:** Headless UI Combobox gives accessibility and keyboard navigation for free. The existing CommandBar component demonstrates this pattern well.

## Common Pitfalls

### Pitfall 1: Dropdown Position Clipped by Overflow
**What goes wrong:** Dropdown appears but gets cut off by parent container's overflow:hidden
**Why it happens:** Search is in AdminHeader which has sticky positioning
**How to avoid:** Use Headless UI's anchor positioning or portal the dropdown
**Warning signs:** Dropdown visible but partially cut off at bottom

### Pitfall 2: Race Conditions in Search Results
**What goes wrong:** Older slow requests return after newer fast requests, showing stale results
**Why it happens:** Network latency varies, requests complete out of order
**How to avoid:** SWR handles this - uses key-based deduplication and keeps latest
**Warning signs:** Results flickering or showing wrong query's results

### Pitfall 3: Impersonation Token Conflict with Tenant Token
**What goes wrong:** Admin's tenant dashboard breaks or shows wrong data
**Why it happens:** Both use 'token' key in localStorage
**How to avoid:** Use separate keys, set 'token' only for impersonation, clear on end
**Warning signs:** Dashboard shows admin's own tenant instead of impersonated

### Pitfall 4: Banner Dismissed or Missing on Navigation
**What goes wrong:** User navigates and banner disappears
**Why it happens:** Component unmounts, state resets
**How to avoid:** Read impersonation state from localStorage, not component state
**Warning signs:** Banner flickers on route change

### Pitfall 5: Search Input Losing Focus
**What goes wrong:** User typing and dropdown closes unexpectedly
**Why it happens:** Re-render causes focus loss, or click outside handling too aggressive
**How to avoid:** Use Combobox's built-in focus management, don't force close on blur
**Warning signs:** User has to click input multiple times to complete search

## Code Examples

Verified patterns from official sources and existing codebase:

### Admin Tenant Search Hook
```typescript
// Source: Existing useAdminApi.ts pattern
export interface UseAdminTenantSearchParams {
  q: string
  limit?: number
}

export function useAdminTenantSearch(query: string, limit: number = 8) {
  // Only fetch if query is at least 2 characters
  const shouldFetch = query.length >= 2
  const searchParams = new URLSearchParams()
  searchParams.set('q', query)
  searchParams.set('limit', limit.toString())

  const endpoint = shouldFetch
    ? `/admin/tenants/search?${searchParams.toString()}`
    : null

  return useSWR<TenantSearchResponseDto>(
    endpoint,
    adminFetcher,
    {
      ...defaultConfig,
      revalidateOnFocus: false,
      keepPreviousData: false, // Show loading state for new queries
    }
  )
}
```

### Search Result Row Component
```typescript
// Source: CONTEXT.md specifications + existing patterns
function SearchResultRow({ tenant, onSelect, onViewDetails }: {
  tenant: TenantSearchResult
  onSelect: () => void
  onViewDetails: () => void
}) {
  return (
    <Combobox.Option
      value={tenant}
      className={({ active }) => clsx(
        'relative flex items-center px-3 py-2 cursor-pointer rounded-lg group',
        active ? 'bg-primary-50 dark:bg-primary-900/30' : ''
      )}
    >
      {({ active }) => (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-space-900 dark:text-white truncate">
              {tenant.name}
            </p>
            {tenant.matchedEmail && (
              <p className="text-xs text-space-500 dark:text-space-400 truncate">
                {tenant.matchedEmail}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View Details link - visible on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails()
              }}
              className={clsx(
                'text-xs text-primary-600 dark:text-primary-400 hover:underline',
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            >
              View Details
            </button>
            {/* Tier badge */}
            <span className={clsx(
              'px-2 py-0.5 text-xs font-medium rounded',
              tenant.tier === 'msp'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-space-100 dark:bg-space-800 text-space-600 dark:text-space-400'
            )}>
              {tenant.tier === 'msp' ? 'MSP' : tenant.tier === 'enterprise' ? 'Business' : 'Home'}
            </span>
          </div>
        </>
      )}
    </Combobox.Option>
  )
}
```

### Start Impersonation Handler
```typescript
// Source: Phase 12 SUMMARY + existing startImpersonation function
async function handleStartImpersonation(tenant: TenantSearchResult) {
  try {
    const response = await startImpersonation(tenant.id)

    storeImpersonation(response.accessToken, {
      tenantId: response.tenantId,
      tenantName: response.tenantName,
      tenantTier: response.tenantTier,
    })

    // Navigate to tenant dashboard (CONTEXT.md: landing page after start)
    window.location.href = '/dashboard'
  } catch (error) {
    // Show toast error
    console.error('Failed to start impersonation:', error)
  }
}
```

### End Impersonation API Call
```typescript
// Source: API controller shows POST /admin/impersonate/end
async function endImpersonationSession(): Promise<void> {
  const token = localStorage.getItem('impersonation_token')
  if (!token) return

  await fetch(`${API_URL}/admin/impersonate/end`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual ARIA attributes | Headless UI components | 2022+ | Built-in accessibility |
| useState for debounce | Custom useDebounce hook | 2023+ | Cleaner, reusable |
| Context API for global state | Dedicated auth contexts | Current project | Separation of concerns |
| Single token for all auth | Separate admin/tenant/impersonation tokens | Phase 9+ | Multi-context support |

**Deprecated/outdated:**
- Headless UI v1 patterns (now v2 with improved anchor positioning)
- Imperative focus management (Headless UI handles automatically)

## Open Questions

Things that couldn't be fully resolved:

1. **Dropdown max width when search is in header**
   - What we know: Header has max-width container, dropdown should not exceed screen
   - What's unclear: Exact pixel width for dropdown (320px? 400px?)
   - Recommendation: Use w-80 (320px) to match Spotlight aesthetic, adjust if needed

2. **Empty state when no results found**
   - What we know: Need to show helpful message
   - What's unclear: Exact wording, should it suggest refining search?
   - Recommendation: "No tenants found for '[query]'" - simple and direct

3. **Keyboard shortcut for search focus**
   - What we know: CommandBar uses Cmd+K for global search
   - What's unclear: Should tenant search have a dedicated shortcut?
   - Recommendation: No shortcut - always visible in header, click to focus

## Sources

### Primary (HIGH confidence)
- Existing codebase: `ui/src/components/command-bar/CommandBar.tsx` - Combobox patterns
- Existing codebase: `ui/src/hooks/useAdminApi.ts` - Admin hooks with SWR
- Existing codebase: `api/src/modules/admin/admin.controller.ts` - Search and impersonation endpoints
- Existing codebase: `api/src/modules/admin/dto/tenant-search.dto.ts` - Response types
- Phase 12 SUMMARY: Impersonation storage pattern with separate keys

### Secondary (MEDIUM confidence)
- [Headless UI Combobox](https://headlessui.com/react/combobox) - Official documentation
- [Debouncing in React](https://medium.com/nerd-for-tech/debounce-your-search-react-input-optimization-fd270a8042b) - Best practices

### Tertiary (LOW confidence)
- None - all patterns verified against official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Patterns from existing codebase (CommandBar, useAdminApi)
- Pitfalls: HIGH - Based on known issues with similar implementations

**Research date:** 2026-01-19
**Valid until:** 60 days (stable patterns, mature libraries)
