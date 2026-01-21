---
phase: 18-rbac-ui
plan: 02
type: execute
wave: 2
depends_on: ["18-01"]
files_modified:
  - admin-ui/src/components/layout/Header.tsx
  - admin-ui/src/contexts/AuthContext.tsx
  - admin-ui/src/hooks/useRequireRole.ts
autonomous: true

must_haves:
  truths:
    - "Admin sees their current role badge in header next to their name"
    - "Admin sees their role and permissions in profile dropdown"
    - "Viewer role sees no write-action navigation items"
    - "Admin role sees standard navigation (no user management)"
    - "Super Admin sees full navigation including user management"
    - "Direct URL access to restricted pages redirects with toast"
  artifacts:
    - path: "admin-ui/src/components/layout/Header.tsx"
      provides: "Header with role badge and filtered navigation"
      contains: "AdminRoleBadge"
    - path: "admin-ui/src/contexts/AuthContext.tsx"
      provides: "Auth context with role-aware helpers"
      exports: ["useAuth", "AuthProvider"]
    - path: "admin-ui/src/hooks/useRequireRole.ts"
      provides: "Route protection hook with toast"
      exports: ["useRequireRole"]
  key_links:
    - from: "admin-ui/src/components/layout/Header.tsx"
      to: "admin-ui/src/components/rbac/AdminRoleBadge.tsx"
      via: "AdminRoleBadge import"
      pattern: "import.*AdminRoleBadge"
    - from: "admin-ui/src/components/layout/Header.tsx"
      to: "admin-ui/src/hooks/useAdminRole.ts"
      via: "useAdminRole hook"
      pattern: "useAdminRole"
---

<objective>
Integrate RBAC into the admin UI header: display role badge, filter navigation items, and add route protection with toast notifications.

Purpose: Make admin roles visible and enforced in the UI. Admins see their role at a glance, navigation is filtered to show only accessible items, and direct URL access to restricted pages is blocked with user-friendly feedback.

Output: Header displays role badge, navigation is role-filtered, route protection redirects with toast.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/18-rbac-ui/18-CONTEXT.md
@.planning/phases/18-rbac-ui/18-RESEARCH.md

# Plan 01 artifacts
@admin-ui/src/lib/admin-permissions.ts
@admin-ui/src/hooks/useAdminRole.ts
@admin-ui/src/components/rbac/AdminRoleBadge.tsx
@admin-ui/src/components/rbac/PermissionGate.tsx

# Existing files to modify
@admin-ui/src/components/layout/Header.tsx
@admin-ui/src/contexts/AuthContext.tsx
@admin-ui/src/components/Toast.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create useRequireRole route protection hook</name>
  <files>admin-ui/src/hooks/useRequireRole.ts</files>
  <action>
Create the useRequireRole hook for route-level protection:

```typescript
/**
 * Nebula DNS - Require Role Hook
 * Route protection with redirect and toast notification
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminRole } from './useAdminRole'
import { useToast } from '@/components/Toast'
import { AdminRole, ADMIN_PERMISSIONS } from '@/lib/admin-permissions'

/**
 * Hook to require a minimum role level for a page.
 * Redirects to dashboard with toast if permission denied.
 *
 * @example
 * function AdminUsersPage() {
 *   const hasAccess = useRequireRole('super_admin')
 *   if (!hasAccess) return null // Will redirect
 *   return <AdminUsersContent />
 * }
 */
export function useRequireRole(requiredRole: AdminRole) {
  const { admin, loading } = useAuth()
  const { hasMinRole, adminRole } = useAdminRole()
  const router = useRouter()
  const { showToast } = useToast()

  const hasAccess = hasMinRole(requiredRole)

  useEffect(() => {
    // Wait for auth to load
    if (loading) return

    // If not authenticated, auth context handles redirect
    if (!admin) return

    // If authenticated but insufficient role, redirect with toast
    if (adminRole && !hasAccess) {
      showToast('warning', 'Access Denied', "You don't have permission to access that page")
      router.push('/')
    }
  }, [loading, admin, adminRole, hasAccess, router, showToast])

  return hasAccess
}

/**
 * Hook to require write permission for a page.
 * Viewers are redirected with toast.
 *
 * @example
 * function EditMspPage() {
 *   const canWrite = useRequireWriteAccess()
 *   if (!canWrite) return null
 *   return <EditMspForm />
 * }
 */
export function useRequireWriteAccess() {
  const { admin, loading } = useAuth()
  const { canWrite, adminRole } = useAdminRole()
  const router = useRouter()
  const { showToast } = useToast()

  useEffect(() => {
    if (loading) return
    if (!admin) return

    if (adminRole && !canWrite) {
      showToast('warning', 'Read-Only Access', "Viewers cannot modify data")
      router.push('/')
    }
  }, [loading, admin, adminRole, canWrite, router, showToast])

  return canWrite
}

/**
 * Hook to require access to a specific feature.
 *
 * @example
 * function AdminUsersPage() {
 *   const canAccess = useRequireFeature('admin-users')
 *   if (!canAccess) return null
 *   return <AdminUsersList />
 * }
 */
export function useRequireFeature(feature: keyof typeof ADMIN_PERMISSIONS) {
  const { admin, loading } = useAuth()
  const { canAccess, adminRole } = useAdminRole()
  const router = useRouter()
  const { showToast } = useToast()

  const hasAccess = canAccess(feature)

  useEffect(() => {
    if (loading) return
    if (!admin) return

    if (adminRole && !hasAccess) {
      showToast('warning', 'Access Denied', "You don't have permission to access that page")
      router.push('/')
    }
  }, [loading, admin, adminRole, hasAccess, router, showToast])

  return hasAccess
}
```
  </action>
  <verify>
File exists at admin-ui/src/hooks/useRequireRole.ts
TypeScript compiles: `cd admin-ui && npx tsc --noEmit`
  </verify>
  <done>Route protection hooks redirect unauthorized users with toast notification</done>
</task>

<task type="auto">
  <name>Task 2: Update Header with role badge and filtered navigation</name>
  <files>admin-ui/src/components/layout/Header.tsx</files>
  <action>
Update the Header component with RBAC integration:

1. Add imports:
```typescript
import { useAdminRole } from '@/hooks/useAdminRole'
import { AdminRoleBadge } from '@/components/rbac/AdminRoleBadge'
import { PermissionGate } from '@/components/rbac/PermissionGate'
import { ADMIN_ROLE_LABELS, ADMIN_PERMISSIONS } from '@/lib/admin-permissions'
```

2. In the Header component, call useAdminRole:
```typescript
const { adminRole, isSuperAdmin, canWrite, canAccess } = useAdminRole()
```

3. Define navigation items with role requirements:
```typescript
const navigationItems = [
  { name: 'Dashboard', href: '/', feature: 'dashboard' as const },
  { name: 'MSPs', href: '/msps', feature: 'msps' as const },
  { name: 'Health', href: '/health', feature: 'health' as const },
]

// Filter based on role
const filteredNavigation = navigationItems.filter(
  item => canAccess(item.feature)
)
```

4. In the header user menu section, add the role badge next to the admin name:
```tsx
<Menu.Button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-space-100 dark:hover:bg-space-800 transition-colors">
  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
    <span className="text-xs font-bold text-white">
      {admin?.name ? getInitials(admin.name) : 'AD'}
    </span>
  </div>
  <span className="hidden sm:block text-sm font-medium text-space-700 dark:text-space-300">
    {admin?.name?.split(' ')[0] || 'Admin'}
  </span>
  {/* Role badge in header */}
  {adminRole && (
    <AdminRoleBadge role={adminRole} size="sm" className="hidden sm:inline-flex" />
  )}
  <ChevronDownIcon className="h-4 w-4 text-space-400" />
</Menu.Button>
```

5. Update the dropdown menu to show role with permissions:
```tsx
{/* Admin Info Header with Role */}
<div className="px-3 py-2 border-b border-space-100 dark:border-space-700">
  <div className="flex items-center gap-2">
    <p className="text-sm font-medium text-space-900 dark:text-white">
      {admin?.name || 'Admin User'}
    </p>
    {adminRole && <AdminRoleBadge role={adminRole} size="sm" />}
  </div>
  <p className="text-xs text-space-500 dark:text-space-400 truncate mt-0.5">
    {admin?.email || 'admin@example.com'}
  </p>
  {/* Permissions list */}
  <div className="mt-2 pt-2 border-t border-space-100 dark:border-space-700">
    <p className="text-xs font-medium text-space-500 dark:text-space-400 mb-1">
      Permissions:
    </p>
    <ul className="text-xs text-space-600 dark:text-space-400 space-y-0.5">
      <li className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
        View dashboards & MSPs
      </li>
      {canWrite && (
        <li className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
          Create & edit MSPs
        </li>
      )}
      {isSuperAdmin && (
        <li className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
          Manage admin users
        </li>
      )}
    </ul>
  </div>
</div>
```

6. Remove the hardcoded "Admin" badge that currently shows for all users (line ~159 in original file):
```tsx
// DELETE this line:
<span className="px-1.5 py-0.5 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
  Admin
</span>
```

7. Use filtered navigation in the nav links section.
  </action>
  <verify>
TypeScript compiles: `cd admin-ui && npx tsc --noEmit`
Header imports and uses AdminRoleBadge
Navigation is filtered by role
  </verify>
  <done>Header displays role badge next to name and in dropdown with permissions list, navigation is role-filtered</done>
</task>

<task type="auto">
  <name>Task 3: Add role helpers to AuthContext</name>
  <files>admin-ui/src/contexts/AuthContext.tsx</files>
  <action>
Add convenience role helpers to the AuthContext:

1. Import AdminRole type:
```typescript
import { AdminRole } from '@/lib/admin-permissions'
```

2. Extend AuthContextType interface:
```typescript
interface AuthContextType {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  sessionExpiresAt: Date | null
  // Role convenience helpers (NEW)
  adminRole: AdminRole | undefined
  isSuperAdmin: boolean
  isAdmin: boolean
  isViewer: boolean
}
```

3. Compute role values in the provider:
```typescript
// Inside AuthProvider, before the return:
const adminRole = admin?.role
const isSuperAdmin = adminRole === 'super_admin'
const isAdmin = adminRole === 'admin' || isSuperAdmin
const isViewer = adminRole === 'viewer'
```

4. Include in the provider value:
```typescript
<AuthContext.Provider
  value={{
    admin,
    loading,
    login,
    logout,
    isAuthenticated: !!admin,
    sessionExpiresAt,
    // Role helpers
    adminRole,
    isSuperAdmin,
    isAdmin,
    isViewer,
  }}
>
```

This allows components to check roles directly from useAuth() without importing useAdminRole for simple cases.
  </action>
  <verify>
TypeScript compiles: `cd admin-ui && npx tsc --noEmit`
AuthContext exports adminRole, isSuperAdmin, isAdmin, isViewer
  </verify>
  <done>AuthContext provides role convenience helpers for simple role checks</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. TypeScript compiles without errors: `cd admin-ui && npx tsc --noEmit`
2. Header shows AdminRoleBadge next to admin name
3. Dropdown menu shows role badge and permissions list
4. Navigation items are filtered based on role (currently all items visible to all roles - Phase 19/20 will add admin-users route)
5. useRequireRole hook redirects with toast when accessing restricted pages
6. AuthContext provides role convenience helpers
</verification>

<success_criteria>
1. Admin sees colored role badge in header next to their name
2. Admin sees role badge and permissions list in profile dropdown
3. Navigation shows only accessible items (filtered by role)
4. Direct URL access to restricted pages redirects to dashboard with toast
5. AuthContext provides adminRole, isSuperAdmin, isAdmin, isViewer helpers
</success_criteria>

<output>
After completion, create `.planning/phases/18-rbac-ui/18-02-SUMMARY.md`
</output>
