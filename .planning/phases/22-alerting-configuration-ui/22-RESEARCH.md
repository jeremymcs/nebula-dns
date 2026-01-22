# Phase 22: Alerting Configuration (UI) - Research

**Researched:** 2026-01-21
**Domain:** Admin UI for Slack/PagerDuty alerting configuration
**Confidence:** HIGH

## Summary

This phase implements the Mission Control (admin-ui) interface for configuring alerting integrations. The research examined the Phase 21 backend implementation, existing admin-ui patterns, component libraries, and the established integrations page in the main UI.

The codebase provides excellent patterns to follow:
1. **Admin-UI Component Library** (`admin-ui/src/components/ui/`) - Card, Modal, Input, Button, Badge with consistent styling
2. **SWR Hooks Pattern** (`admin-ui/src/hooks/useApi.ts`) - Admin fetcher with JWT token handling
3. **Integrations Page** (`ui/src/app/dashboard/settings/integrations/page.tsx`) - Reference implementation for SIEM/webhook configuration UI
4. **Zod Validation** (`admin-ui/src/lib/validations/`) - Form validation schemas

The backend API (Phase 21) provides RESTful endpoints at `/admin/alerting/*` with full CRUD operations, enable/disable toggles, and test functionality.

**Primary recommendation:** Create an Alerting settings page in admin-ui following the existing integrations page pattern, using the admin-ui component library and SWR hooks for data fetching. Use Card components for each integration type with inline configuration forms.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 14.x | React framework | Already in admin-ui |
| `react` | 18.x | UI library | Already in admin-ui |
| `swr` | 2.x | Data fetching with caching | Already in admin-ui/useApi.ts |
| `zod` | 3.x | Form validation | Already in admin-ui/lib/validations |
| `@headlessui/react` | 2.x | Accessible UI primitives (Modal, Dialog) | Already in admin-ui |
| `@heroicons/react` | 2.x | Icon library | Already in admin-ui |
| `clsx` | 2.x | Conditional class names | Already in admin-ui |
| `framer-motion` | 10.x | Animations (Toast) | Already in admin-ui |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tailwindcss` | 3.x | Utility CSS | Styling all components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SWR | React Query | SWR already used throughout admin-ui, consistency preferred |
| Zod | Yup | Zod already used in admin-ui, better TypeScript inference |
| Custom modals | Radix UI Dialog | @headlessui already in use, consistent patterns |

**Installation:**
```bash
# No new dependencies required - all patterns already exist in admin-ui codebase
```

## Architecture Patterns

### Recommended Project Structure
```
admin-ui/src/
├── app/(authenticated)/settings/
│   └── alerting/
│       └── page.tsx              # Main alerting settings page
├── components/alerting/
│   ├── AlertConfigCard.tsx       # Card for each integration type
│   ├── SlackConfigForm.tsx       # Slack-specific form fields
│   ├── PagerDutyConfigForm.tsx   # PagerDuty-specific form fields
│   ├── AlertConfigModal.tsx      # Create/edit modal wrapper
│   └── TestAlertButton.tsx       # Test button with feedback
├── hooks/
│   └── useAlertConfigs.ts        # SWR hook for alert configurations
└── lib/validations/
    └── alerting.schema.ts        # Zod schemas for Slack/PagerDuty forms
```

### Pattern 1: SWR Hook for Alert Configurations
**What:** Custom SWR hook matching existing admin-ui patterns
**When to use:** For fetching and mutating alert configurations
**Example:**
```typescript
// Source: Based on admin-ui/src/hooks/useApi.ts patterns
import useSWR from 'swr'
import { adminFetcher } from './useApi'

export interface AlertConfig {
  id: string
  name: string
  providerType: 'slack' | 'pagerduty'
  isEnabled: boolean
  severityFilter: ('critical' | 'error' | 'warning' | 'info')[]
  eventTypes: ('system_health' | 'billing' | 'security')[]
  lastSentAt: string | null
  lastError: string | null
  errorCount: number
  createdAt: string
}

export function useAlertConfigs() {
  return useSWR<AlertConfig[]>('/admin/alerting', adminFetcher)
}
```

### Pattern 2: Integration Card Component
**What:** Card displaying integration status with enable/disable toggle
**When to use:** For each Slack/PagerDuty configuration
**Example:**
```typescript
// Source: Based on ui/src/app/dashboard/settings/integrations/page.tsx
<Card variant="glass" padding="md">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
        {/* Provider icon */}
      </div>
      <div>
        <div className="font-medium text-space-900 dark:text-white">{config.name}</div>
        <div className="text-sm text-space-500 dark:text-space-400">{providerLabel}</div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <StatusBadge status={config.isEnabled ? 'active' : 'inactive'} />
      <Button variant="ghost" onClick={() => handleTest(config.id)}>Test</Button>
      <Button variant="ghost" onClick={() => handleEdit(config)}>Edit</Button>
    </div>
  </div>
</Card>
```

### Pattern 3: Modal Form with Zod Validation
**What:** Form validation using Zod schemas matching backend DTOs
**When to use:** For create/edit configuration modals
**Example:**
```typescript
// Source: Based on admin-ui/src/lib/validations/admin-invite.schema.ts
import { z } from 'zod'

export const slackConfigSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less'),
  webhookUrl: z.string()
    .min(1, 'Webhook URL is required')
    .url('Must be a valid URL')
    .regex(/^https:\/\/hooks\.slack\.com\//, 'Must start with https://hooks.slack.com/'),
  severityFilter: z.array(z.enum(['critical', 'error', 'warning', 'info']))
    .optional()
    .default(['critical', 'error']),
  eventTypes: z.array(z.enum(['system_health', 'billing', 'security']))
    .optional()
    .default([]),
})

export const pagerDutyConfigSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less'),
  routingKey: z.string()
    .length(32, 'Routing key must be exactly 32 characters'),
  severityFilter: z.array(z.enum(['critical', 'error', 'warning', 'info']))
    .optional()
    .default(['critical', 'error']),
  eventTypes: z.array(z.enum(['system_health', 'billing', 'security']))
    .optional()
    .default([]),
})
```

### Pattern 4: Test Alert with Feedback
**What:** Test button with loading state and toast feedback
**When to use:** ALERT-09 requirement for testing configurations
**Example:**
```typescript
// Source: Based on existing test patterns in integrations page
const handleTest = async (configId: string) => {
  setTestingId(configId)
  try {
    const result = await testAlertConfig(configId)
    if (result.success) {
      showToast('success', 'Test alert sent successfully', `Response time: ${result.responseTimeMs}ms`)
    } else {
      showToast('error', 'Test alert failed', result.message)
    }
  } catch (err: any) {
    showToast('error', 'Failed to send test alert', err.message)
  } finally {
    setTestingId(null)
  }
}
```

### Anti-Patterns to Avoid
- **Storing webhook URLs in component state after form submission:** Never retain credentials in memory longer than necessary
- **Showing success toast before API confirms:** Always wait for API response before showing success feedback
- **No loading states:** Every async operation needs visual feedback
- **Inline form validation only:** Always validate on client and server (server is authoritative)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialogs | Custom portal logic | `@headlessui/react Dialog` | Accessibility, focus trapping, backdrop |
| Form validation | Manual regex checks | Zod schemas | Type inference, consistent error messages |
| API data caching | useState + useEffect | SWR hooks | Deduplication, revalidation, caching |
| Toast notifications | Custom solution | Existing Toast context | Animation, auto-dismiss, consistent styling |
| Loading spinners | Custom SVG | LoadingSpinner component | Consistent sizing, animation |
| Status badges | Custom styling | Badge/StatusBadge components | Consistent colors, variants |

**Key insight:** Admin-UI already has a comprehensive component library. Use existing components rather than creating one-off styling.

## Common Pitfalls

### Pitfall 1: Credential Display in Forms
**What goes wrong:** Showing actual webhook URLs or routing keys in edit forms
**Why it happens:** Treating credentials like regular form data
**How to avoid:** Backend never returns encrypted credentials; edit forms only update non-sensitive fields or require re-entering credentials
**Warning signs:** Form pre-populated with webhook URL on edit

### Pitfall 2: Missing Error Tracking Display
**What goes wrong:** Admin doesn't see that an integration is failing
**Why it happens:** Only showing isEnabled status, ignoring errorCount
**How to avoid:** Display error count and last error message prominently when > 0
**Warning signs:** Integration appears "Active" but hasn't sent alerts due to errors

### Pitfall 3: No Confirmation on Delete
**What goes wrong:** Accidental deletion of alert configurations
**Why it happens:** Direct delete without confirmation dialog
**How to avoid:** Use ConfirmDialog component before destructive actions
**Warning signs:** Delete button triggers immediate API call

### Pitfall 4: Stale SWR Data After Mutation
**What goes wrong:** UI shows old data after create/update/delete
**Why it happens:** Not calling mutate() after mutations
**How to avoid:** Always call `mutate('/admin/alerting')` after successful CRUD operations
**Warning signs:** Need to refresh page to see changes

### Pitfall 5: Test Alert Without Error Handling
**What goes wrong:** Test button shows success even when external service failed
**Why it happens:** Only checking HTTP status, not response body
**How to avoid:** API returns { success: boolean, message: string } - check success field
**Warning signs:** Test shows success but Slack/PagerDuty didn't receive alert

## Code Examples

Verified patterns from codebase:

### Admin API Mutation Function
```typescript
// Source: Based on admin-ui/src/hooks/useApi.ts patterns
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010'

export async function createSlackConfig(data: CreateSlackConfigDto): Promise<AlertConfig> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/alerting/slack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed (${res.status})`)
  }

  return res.json()
}
```

### Test Alert Function
```typescript
// Source: Based on Phase 21 API controller
export interface TestAlertResponse {
  success: boolean
  message: string
  responseTimeMs?: number
}

export async function testAlertConfig(configId: string): Promise<TestAlertResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/alerting/${configId}/test`, {
    method: 'POST',
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

### Enable/Disable Toggle
```typescript
// Source: Based on Phase 21 API endpoints
export async function enableAlertConfig(configId: string): Promise<{ message: string }> {
  const token = localStorage.getItem('admin_token')
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/alerting/${configId}/enable`, {
    method: 'POST',
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

export async function disableAlertConfig(configId: string): Promise<{ message: string }> {
  const token = localStorage.getItem('admin_token')
  if (!token) throw new Error('Admin authentication required')

  const res = await fetch(`${API_URL}/admin/alerting/${configId}/disable`, {
    method: 'POST',
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

### Provider Type Display Config
```typescript
// Source: Based on ui/src/app/dashboard/settings/integrations/page.tsx
const providerConfig = {
  slack: {
    name: 'Slack',
    icon: 'HashtagIcon', // or custom SVG
    color: 'bg-[#4A154B]',
    description: 'Send alerts to Slack channels via webhooks',
  },
  pagerduty: {
    name: 'PagerDuty',
    icon: 'BellAlertIcon',
    color: 'bg-[#06AC38]',
    description: 'Create PagerDuty incidents for critical alerts',
  },
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux for state | SWR + Context | Already in admin-ui | Less boilerplate, automatic caching |
| CSS Modules | Tailwind CSS | Already in admin-ui | Faster development, consistent design |
| Class components | Functional + hooks | Already in admin-ui | Simpler code, better composability |
| Manual forms | Zod + controlled inputs | Already in admin-ui | Type safety, validation messages |

**Deprecated/outdated:**
- None - admin-ui uses modern patterns throughout

## Open Questions

Things that couldn't be fully resolved:

1. **Navigation placement for Alerting settings**
   - What we know: Header has Dashboard, MSPs, Health, Admin Users navigation
   - What's unclear: Whether Alerting should be a top-level nav item or under a Settings submenu
   - Recommendation: Add as top-level nav item "Alerting" for discoverability; can refactor to Settings submenu later

2. **Severity filter UI representation**
   - What we know: API accepts array of severities ['critical', 'error', 'warning', 'info']
   - What's unclear: Checkbox group vs multi-select dropdown
   - Recommendation: Use checkbox group for 4 options - more scannable and touchable

3. **Event type filter UI**
   - What we know: API accepts array of event types or empty for all
   - What's unclear: Whether to show as advanced setting or always visible
   - Recommendation: Always visible with checkbox group; empty selection means "all events"

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - `admin-ui/src/hooks/useApi.ts` - SWR fetcher and mutation patterns
  - `admin-ui/src/components/ui/` - Component library (Card, Modal, Button, Input, Badge)
  - `admin-ui/src/lib/validations/` - Zod schema patterns
  - `ui/src/app/dashboard/settings/integrations/page.tsx` - Reference integrations UI
  - `api/src/modules/alerting/alerting.controller.ts` - Backend API endpoints

### Secondary (MEDIUM confidence)
- Phase 21 summaries:
  - `.planning/phases/21-alerting-integrations-backend/21-01-SUMMARY.md` through `21-05-SUMMARY.md`
  - Documents API contract, DTOs, and validation rules

### Tertiary (LOW confidence)
- None - all research based on authoritative codebase analysis

## Backend API Reference

Summary of Phase 21 API endpoints for UI consumption:

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/admin/alerting` | GET | List all configs | - | AlertConfigResponseDto[] |
| `/admin/alerting/:id` | GET | Get single config | - | AlertConfigResponseDto |
| `/admin/alerting/slack` | POST | Create Slack config | CreateSlackConfigDto | AlertConfigResponseDto |
| `/admin/alerting/pagerduty` | POST | Create PagerDuty config | CreatePagerDutyConfigDto | AlertConfigResponseDto |
| `/admin/alerting/:id` | PATCH | Update config | UpdateAlertConfigDto | AlertConfigResponseDto |
| `/admin/alerting/:id/enable` | POST | Enable config | - | { message: string } |
| `/admin/alerting/:id/disable` | POST | Disable config | - | { message: string } |
| `/admin/alerting/:id/test` | POST | Send test alert | - | TestAlertResponseDto |
| `/admin/alerting/:id` | DELETE | Delete config | - | 204 No Content |

**Key validation rules from Phase 21:**
- Slack webhookUrl: Must start with `https://hooks.slack.com/`
- PagerDuty routingKey: Exactly 32 characters
- severityFilter: Default `['critical', 'error']`
- eventTypes: Default `[]` (empty = all types)
- Auto-disable after 10 consecutive failures

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in admin-ui
- Architecture: HIGH - Following established admin-ui patterns
- Pitfalls: HIGH - Based on integrations page reference implementation
- API contract: HIGH - From Phase 21 implementation

**Research date:** 2026-01-21
**Valid until:** 60 days (patterns are stable, UI components rarely change)
