# Phase 20: Admin User Management (UI) - Research

**Researched:** 2026-01-21
**Domain:** React/Next.js Admin UI with RBAC
**Confidence:** HIGH

## Summary

This phase delivers the Mission Control UI components for admin user management, consuming the backend APIs created in Phase 19. The existing admin-ui codebase provides a comprehensive component library, established patterns for RBAC, and well-documented hooks for API interaction.

The research reveals:
1. **Full backend API coverage** exists from Phase 19 with endpoints for listing admins, invitations, activity logs, and management actions (suspend, reactivate, MFA reset)
2. **Complete UI component library** is already in place (Modal, ConfirmDialog, Badge, Tabs, Table patterns, Skeleton loading)
3. **RBAC infrastructure** is built and tested (PermissionGate, useRequireRole, AdminRoleBadge)
4. **Form handling patterns** are established (react-hook-form + zod + zodResolver)
5. **Navigation requires extension** to add Admin Users menu item for super_admin role only

**Primary recommendation:** Build 4-5 new components that compose existing UI primitives, add a new page route, and extend the navigation configuration. The existing patterns should be followed exactly.

## Standard Stack

The established libraries/tools for this phase (already installed in admin-ui):

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 14 | 14.x | App router with RSC | Already used throughout admin-ui |
| React 18 | 18.x | Component framework | Already used throughout admin-ui |
| react-hook-form | 7.x | Form state management | Used in MspOnboardingWizard |
| zod | 3.x | Schema validation | Used in msp-onboarding.schema.ts |
| @hookform/resolvers | 3.x | Zod integration | Used in MspOnboardingWizard |
| SWR | 2.x | Data fetching with cache | Used in useApi hooks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @headlessui/react | 2.x | Accessible modals, menus | Used in Modal, Header components |
| @heroicons/react | 2.x | Icon library | Used throughout admin-ui |
| framer-motion | 11.x | Animations | Used in Toast, wizard transitions |
| clsx | 2.x | Conditional classNames | Used in all components |
| date-fns | 2.x | Date formatting | Time ago, expiry countdowns |

### Already Available (No New Dependencies)
All required libraries are already installed in admin-ui/package.json. No new dependencies needed.

## Architecture Patterns

### Project Structure (Existing)
```
admin-ui/src/
├── app/
│   ├── (authenticated)/
│   │   ├── layout.tsx           # Protected layout with Header
│   │   ├── page.tsx             # Dashboard
│   │   ├── msps/                # MSP pages
│   │   ├── health/              # Health page
│   │   └── users/               # NEW: Admin users page
│   │       └── page.tsx
│   └── login/
│       └── page.tsx
├── components/
│   ├── layout/
│   │   └── Header.tsx           # UPDATE: Add Admin Users nav item
│   ├── rbac/
│   │   ├── AdminRoleBadge.tsx   # Reuse for user list
│   │   └── PermissionGate.tsx   # Reuse for conditional rendering
│   ├── ui/                      # Reuse all components
│   └── admin-users/             # NEW: Admin user management components
│       ├── AdminUsersTable.tsx
│       ├── InviteAdminModal.tsx
│       ├── AdminDetailDrawer.tsx
│       ├── PendingInvitesSection.tsx
│       └── ActivityLogTable.tsx
├── hooks/
│   ├── useApi.ts                # UPDATE: Add admin user hooks
│   └── useAdminRole.ts          # Reuse
└── lib/
    ├── admin-permissions.ts     # Already has 'admin-users' permission
    └── validations/
        └── admin-invite.schema.ts  # NEW: Zod validation for invite
```

### Pattern 1: Page-Level Role Protection
**What:** Use `useRequireFeature` hook to protect entire page routes
**When to use:** Any page that requires specific RBAC permissions
**Example:**
```typescript
// Source: admin-ui/src/hooks/useRequireRole.ts
'use client'

export default function AdminUsersPage() {
  // Returns false and redirects if not super_admin
  const hasAccess = useRequireFeature('admin-users')

  if (!hasAccess) return null // Will redirect

  return <AdminUsersPageContent />
}
```

### Pattern 2: SWR Data Fetching Hook
**What:** Custom hook wrapping SWR for type-safe API calls
**When to use:** All GET endpoints that need caching/revalidation
**Example:**
```typescript
// Source: Pattern from admin-ui/src/hooks/useApi.ts
export function useAdminUsers(params?: UseAdminUsersParams) {
  const searchParams = new URLSearchParams()
  if (params?.role) searchParams.set('role', params.role)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)

  const query = searchParams.toString()
  const endpoint = `/admin/users${query ? `?${query}` : ''}`

  return useSWR<ListAdminsResponse>(endpoint, adminFetcher, defaultConfig)
}
```

### Pattern 3: Modal with Confirmation
**What:** Use ConfirmDialog for destructive actions
**When to use:** Suspend, revoke, reset MFA actions
**Example:**
```typescript
// Source: admin-ui/src/components/ui/Modal.tsx
<ConfirmDialog
  isOpen={showSuspendModal}
  onClose={() => setShowSuspendModal(false)}
  onConfirm={handleSuspend}
  title="Suspend Admin"
  message={`Are you sure you want to suspend ${admin.name}? They will be unable to login.`}
  confirmText="Suspend"
  variant="danger"
  isLoading={isSuspending}
/>
```

### Pattern 4: Form with Zod Validation
**What:** react-hook-form with zodResolver for type-safe forms
**When to use:** Invite admin form, accept invitation form
**Example:**
```typescript
// Source: Pattern from admin-ui/src/components/msp-onboarding/MspOnboardingWizard.tsx
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<InviteAdminFormData>({
  resolver: zodResolver(inviteAdminSchema),
  mode: 'onBlur',
})
```

### Anti-Patterns to Avoid
- **Direct fetch() calls:** Always use adminFetcher or create typed API functions
- **Inline role checks:** Use PermissionGate component or useRequireRole hooks
- **Custom loading spinners:** Use FullPageLoading or Skeleton components
- **Manual toast calls:** Always use useToast hook from Toast provider

## Don't Hand-Roll

Problems that have existing solutions in the codebase:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role-based visibility | Custom `if (role === 'super_admin')` checks | `<PermissionGate requireSuperAdmin>` | Centralized, tested |
| Route protection | Manual redirects | `useRequireRole('super_admin')` | Handles redirect + toast |
| Confirmation dialogs | Custom modal | `<ConfirmDialog variant="danger">` | Consistent UX, accessible |
| Loading states | Custom spinners | `<SkeletonTable>`, `<SkeletonList>` | Matches design system |
| Role display | Custom badge | `<AdminRoleBadge role={role}>` | Has glow effect for super_admin |
| Status indicators | Custom dots | `<StatusDot status="success">` | Consistent styling |
| Form validation | Manual validation | zod schema + zodResolver | Type-safe, declarative |
| API calls | Raw fetch | SWR hooks + adminFetcher | Caching, error handling |

**Key insight:** The admin-ui codebase is mature with established patterns. All UI primitives exist; this phase composes them into new features.

## Common Pitfalls

### Pitfall 1: Missing Role Check on Page Load
**What goes wrong:** Page renders briefly before redirect for unauthorized users
**Why it happens:** Async role check completes after initial render
**How to avoid:** Return `null` from component while checking, show loading state
**Warning signs:** Flash of content before redirect

```typescript
// CORRECT
const hasAccess = useRequireFeature('admin-users')
if (!hasAccess) return null // Will redirect
return <PageContent />

// WRONG - shows content briefly
if (!isSuperAdmin) router.push('/')
return <PageContent />
```

### Pitfall 2: Stale Data After Mutation
**What goes wrong:** Table doesn't update after suspend/invite action
**Why it happens:** SWR cache not invalidated after mutation
**How to avoid:** Call `mutate()` from SWR hook after successful mutation
**Warning signs:** Need to refresh page to see changes

```typescript
// CORRECT
const { data, mutate } = useAdminUsers()

const handleSuspend = async () => {
  await suspendAdmin(id)
  mutate() // Revalidate cache
}
```

### Pitfall 3: Form Not Clearing After Submit
**What goes wrong:** Form shows previous values after successful submission
**Why it happens:** react-hook-form maintains state after submit
**How to avoid:** Call `reset()` after successful submit, or close modal
**Warning signs:** Invite modal shows previous email after sending

### Pitfall 4: Inconsistent Time Display
**What goes wrong:** Some dates show "2 hours ago", others show ISO strings
**Why it happens:** Inconsistent date formatting across components
**How to avoid:** Create shared formatters, use date-fns consistently
**Warning signs:** Mix of formats in same table

## Code Examples

Verified patterns from the existing codebase:

### Admin User List Item (from MSP pattern)
```typescript
// Source: Pattern from admin-ui/src/app/(authenticated)/msps/page.tsx
<tr
  key={admin.id}
  onClick={() => handleViewDetails(admin.id)}
  className="table-row cursor-pointer hover:bg-space-50 dark:hover:bg-space-800/50 transition-colors"
>
  <td className="table-cell">
    <div className="flex items-center">
      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
        <UserIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="ml-4">
        <div className="text-sm font-medium text-space-900 dark:text-white">
          {admin.name}
        </div>
        <div className="text-xs text-space-500 dark:text-space-400">
          {admin.email}
        </div>
      </div>
    </div>
  </td>
  <td className="table-cell">
    <AdminRoleBadge role={admin.role} />
  </td>
  <td className="table-cell">
    <Badge variant={getStatusVariant(admin.status)} size="sm">
      {admin.status}
    </Badge>
  </td>
  <td className="table-cell text-sm text-space-500 dark:text-space-400">
    {admin.lastLoginAt ? formatTimeAgo(admin.lastLoginAt) : 'Never'}
  </td>
  <td className="table-cell text-right">
    {/* Action menu */}
  </td>
</tr>
```

### Invite Admin Form Schema
```typescript
// NEW: admin-ui/src/lib/validations/admin-invite.schema.ts
import { z } from 'zod'
import { AdminRole } from '@/lib/admin-permissions'

export const inviteAdminSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  role: z.enum(['super_admin', 'admin', 'viewer'], {
    errorMap: () => ({ message: 'Role is required' }),
  }),
})

export type InviteAdminFormData = z.infer<typeof inviteAdminSchema>
```

### Activity Log Entry
```typescript
// Pattern for activity log display
<div className="flex items-start gap-4 py-4 border-b border-space-200 dark:border-space-700 last:border-0">
  <div className="flex-shrink-0">
    <div className={clsx(
      'w-8 h-8 rounded-full flex items-center justify-center',
      getActionIconBg(activity.action)
    )}>
      {getActionIcon(activity.action)}
    </div>
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm text-space-900 dark:text-white">
      <span className="font-medium">{activity.adminName}</span>
      {' '}
      <span className="text-space-500">{getActionDescription(activity.action)}</span>
      {activity.targetAdminEmail && (
        <>
          {' '}
          <span className="font-medium">{activity.targetAdminEmail}</span>
        </>
      )}
    </p>
    <p className="text-xs text-space-400 dark:text-space-500 mt-1">
      {formatTimeAgo(activity.createdAt)}
      {activity.ipAddress && ` from ${activity.ipAddress}`}
    </p>
  </div>
</div>
```

## Backend API Reference

All endpoints are under `/api/admin/users/*` and require `super_admin` role (except accept-invite).

### Admin User Endpoints
| Endpoint | Method | Purpose | Response Type |
|----------|--------|---------|---------------|
| `/admin/users` | GET | List all admins | `ListAdminsResponseDto` |
| `/admin/users/:id` | GET | Get admin detail | `AdminDetailDto` |
| `/admin/users/:id/suspend` | PATCH | Suspend admin | `{ message: string }` |
| `/admin/users/:id/reactivate` | PATCH | Reactivate admin | `{ message: string }` |
| `/admin/users/:id/mfa/reset` | POST | Reset admin MFA | `{ message: string }` |

### Invitation Endpoints
| Endpoint | Method | Purpose | Response Type |
|----------|--------|---------|---------------|
| `/admin/users/invite` | POST | Send invitation | `CreateAdminInvitationResponseDto` |
| `/admin/users/invite/accept` | POST | Accept invitation (PUBLIC) | `{ message: string }` |
| `/admin/users/invites` | GET | List invitations | `ListInvitationsResponseDto` |
| `/admin/users/invites/:id` | DELETE | Revoke invitation | `{ message: string }` |

### Activity Endpoints
| Endpoint | Method | Purpose | Response Type |
|----------|--------|---------|---------------|
| `/admin/users/activity` | GET | List activity logs | `AdminActivityResponseDto` |

## Navigation Update Required

The Header component needs a new navigation item for super_admin only:

```typescript
// In admin-ui/src/components/layout/Header.tsx
const navigationItems = [
  { name: 'Dashboard', href: '/', feature: 'dashboard' as const },
  { name: 'MSPs', href: '/msps', feature: 'msps' as const },
  { name: 'Health', href: '/health', feature: 'health' as const },
  // NEW: Add this
  { name: 'Admin Users', href: '/users', feature: 'admin-users' as const },
]
```

The `admin-users` feature is already defined in `admin-permissions.ts` with `['super_admin']` access.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for auth | Still localStorage but separate keys for admin | Phase 18 | Keep using admin_token key |
| Direct role string checks | Role hierarchy with hasMinimumRole | Phase 18 | Use ADMIN_ROLE_HIERARCHY |

**Current patterns:**
- SWR for data fetching (not tanstack-query)
- react-hook-form for forms (not formik)
- Headless UI for modals (not custom)
- Zod for validation (not yup)

## Open Questions

Things that couldn't be fully resolved:

1. **Accept Invitation Page Location**
   - What we know: Endpoint is public, no auth required
   - What's unclear: Should it be at `/invite/accept` in admin-ui or a separate route?
   - Recommendation: Create `/invite/accept` page that accepts token from URL query param

2. **Drawer vs Modal for Admin Detail**
   - What we know: Success criteria mentions "Admin detail drawer"
   - What's unclear: No existing drawer component in admin-ui
   - Recommendation: Use Modal with `size="xl"` for slide-over effect, or create Drawer component

3. **Activity Log Pagination**
   - What we know: Backend supports cursor pagination
   - What's unclear: UI pattern for activity logs (infinite scroll vs pagination)
   - Recommendation: Use "Load More" button similar to MSP client list pattern

## Sources

### Primary (HIGH confidence)
- `admin-ui/src/` - All existing components and patterns examined
- `api/src/modules/admin/admin-users.controller.ts` - Backend endpoints verified
- `api/src/modules/admin/dto/` - API request/response types verified

### Secondary (MEDIUM confidence)
- Phase 18 research and plans (navigation structure)
- Phase 19 plans (backend implementation details)

### Tertiary (LOW confidence)
- None - all research based on existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Examined package.json and existing components
- Architecture: HIGH - Patterns verified in working components
- Pitfalls: HIGH - Based on actual code patterns observed
- Backend API: HIGH - Controller and DTOs examined directly

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (patterns are stable, internal codebase)
