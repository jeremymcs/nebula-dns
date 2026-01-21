---
phase: 18-rbac-ui
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - admin-ui/src/lib/admin-permissions.ts
  - admin-ui/src/lib/api.ts
  - admin-ui/src/hooks/useAdminRole.ts
  - admin-ui/src/components/rbac/AdminRoleBadge.tsx
  - admin-ui/src/components/rbac/PermissionGate.tsx
autonomous: true

must_haves:
  truths:
    - "AdminRole type matches backend enum (super_admin, admin, viewer)"
    - "AdminUser interface includes role property"
    - "useAdminRole hook provides role checking utilities"
    - "AdminRoleBadge displays colored badge per role"
  artifacts:
    - path: "admin-ui/src/lib/admin-permissions.ts"
      provides: "Admin role type definitions and permission matrix"
      exports: ["AdminRole", "ADMIN_ROLE_HIERARCHY", "ADMIN_ROLE_LABELS", "ADMIN_PERMISSIONS"]
    - path: "admin-ui/src/lib/api.ts"
      provides: "AdminUser interface with role"
      contains: "role: AdminRole"
    - path: "admin-ui/src/hooks/useAdminRole.ts"
      provides: "React hook for role checks"
      exports: ["useAdminRole"]
    - path: "admin-ui/src/components/rbac/AdminRoleBadge.tsx"
      provides: "Colored role badge component"
      exports: ["AdminRoleBadge"]
    - path: "admin-ui/src/components/rbac/PermissionGate.tsx"
      provides: "Conditional rendering wrapper"
      exports: ["PermissionGate"]
  key_links:
    - from: "admin-ui/src/hooks/useAdminRole.ts"
      to: "admin-ui/src/lib/admin-permissions.ts"
      via: "AdminRole type import"
      pattern: "import.*AdminRole.*from.*admin-permissions"
    - from: "admin-ui/src/components/rbac/AdminRoleBadge.tsx"
      to: "admin-ui/src/lib/admin-permissions.ts"
      via: "Role labels and styling"
      pattern: "ADMIN_ROLE_LABELS"
---

<objective>
Create the foundational RBAC UI infrastructure: AdminRole types, useAdminRole hook, and AdminRoleBadge component.

Purpose: Establish the frontend role system that all RBAC UI work builds upon. This creates type definitions, role checking utilities, and the visual badge component before integrating into the header.

Output: Type definitions, hook, and components ready for integration into Header and navigation.
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

# Phase 17 context - backend RBAC implementation
@.planning/phases/17-rbac-foundation-backend/17-01-SUMMARY.md
@.planning/phases/17-rbac-foundation-backend/17-02-SUMMARY.md

# Existing patterns to follow
@admin-ui/src/lib/api.ts
@admin-ui/src/contexts/AuthContext.tsx
@admin-ui/src/components/ui/Badge.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create admin permissions type definitions</name>
  <files>admin-ui/src/lib/admin-permissions.ts</files>
  <action>
Create the admin permissions file with role types matching the backend:

1. AdminRole type: 'super_admin' | 'admin' | 'viewer' (matches backend AdminRole enum values)

2. ADMIN_ROLE_HIERARCHY: Map roles to numeric levels for comparison
   - super_admin: 3
   - admin: 2
   - viewer: 1

3. ADMIN_ROLE_LABELS: Human-readable labels
   - super_admin: 'Super Admin'
   - admin: 'Admin'
   - viewer: 'Viewer'

4. ADMIN_ROLE_STYLES: Badge styling per role (following CONTEXT.md decisions)
   - super_admin: Red colors with glow effect
     - bg: 'bg-danger-100 dark:bg-danger-900/30'
     - text: 'text-danger-700 dark:text-danger-300'
     - glow: 'ring-2 ring-danger-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
   - admin: Blue/accent colors (no glow)
     - bg: 'bg-accent-100 dark:bg-accent-900/30'
     - text: 'text-accent-700 dark:text-accent-300'
   - viewer: Gray/neutral colors (no glow)
     - bg: 'bg-space-100 dark:bg-space-800'
     - text: 'text-space-600 dark:text-space-400'

5. ADMIN_PERMISSIONS: Permission matrix for navigation items
   - dashboard: all roles
   - msps: all roles
   - health: all roles
   - tenant-billing: all roles for read, admin+ for write
   - admin-users: super_admin only
   - alerting-config: super_admin only (future phase)

6. Helper function: hasMinimumRole(userRole: AdminRole, requiredRole: AdminRole): boolean

Include copyright header per project conventions.
  </action>
  <verify>
File exists at admin-ui/src/lib/admin-permissions.ts
TypeScript compiles: `cd admin-ui && npx tsc --noEmit`
  </verify>
  <done>Admin role types, hierarchy, labels, styles, and permissions exported</done>
</task>

<task type="auto">
  <name>Task 2: Update AdminUser interface with role</name>
  <files>admin-ui/src/lib/api.ts</files>
  <action>
Update the AdminUser interface and related types:

1. Import AdminRole from './admin-permissions'

2. Add role property to AdminUser interface:
```typescript
export interface AdminUser {
  id: string
  email: string
  name: string
  status: 'active' | 'suspended' | 'pending_mfa'
  mfaSetupComplete: boolean
  lastLoginAt: Date | null
  role: AdminRole  // NEW - matches backend response
}
```

3. The AdminLoginResponse uses AdminUser so it will automatically include role

4. No changes needed to adminLogin or getAdminProfile functions - they already return the full response object which now includes role from the backend (Phase 17-02 added this)

Do NOT modify the API functions, only the interface.
  </action>
  <verify>
TypeScript compiles: `cd admin-ui && npx tsc --noEmit`
AdminUser interface has role property
  </verify>
  <done>AdminUser interface includes role property typed as AdminRole</done>
</task>

<task type="auto">
  <name>Task 3: Create useAdminRole hook</name>
  <files>admin-ui/src/hooks/useAdminRole.ts</files>
  <action>
Create the useAdminRole hook following the pattern from useTierFeatures in the main UI:

```typescript
/**
 * Nebula DNS - Admin Role Hook
 * React hook for checking admin role permissions in components
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  AdminRole,
  ADMIN_ROLE_HIERARCHY,
  ADMIN_PERMISSIONS,
  hasMinimumRole,
} from '@/lib/admin-permissions'

export function useAdminRole() {
  const { admin } = useAuth()

  const adminRole = admin?.role

  // Role checks
  const isSuperAdmin = adminRole === 'super_admin'
  const isAdmin = adminRole === 'admin' || isSuperAdmin
  const isViewer = adminRole === 'viewer'

  // Permission checks
  const canWrite = isSuperAdmin || adminRole === 'admin'
  const canManageAdmins = isSuperAdmin
  const canConfigureAlerting = isSuperAdmin

  // Check if user has minimum required role
  const hasMinRole = (required: AdminRole): boolean => {
    if (!adminRole) return false
    return hasMinimumRole(adminRole, required)
  }

  // Check if user can access a specific feature
  const canAccess = (feature: keyof typeof ADMIN_PERMISSIONS): boolean => {
    if (!adminRole) return false
    return ADMIN_PERMISSIONS[feature].includes(adminRole)
  }

  return {
    // Role info
    adminRole,
    isSuperAdmin,
    isAdmin,
    isViewer,

    // Permission checks
    canWrite,
    canManageAdmins,
    canConfigureAlerting,

    // Generic checks
    hasMinRole,
    canAccess,
  }
}
```

Create hooks directory if it doesn't exist: admin-ui/src/hooks/
  </action>
  <verify>
File exists at admin-ui/src/hooks/useAdminRole.ts
TypeScript compiles: `cd admin-ui && npx tsc --noEmit`
  </verify>
  <done>useAdminRole hook provides role checking utilities for components</done>
</task>

<task type="auto">
  <name>Task 4: Create AdminRoleBadge component</name>
  <files>admin-ui/src/components/rbac/AdminRoleBadge.tsx</files>
  <action>
Create the AdminRoleBadge component with role-specific styling:

```typescript
/**
 * Nebula DNS - Admin Role Badge Component
 * Displays admin role with role-specific colors and styling
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import clsx from 'clsx'
import {
  AdminRole,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_STYLES,
} from '@/lib/admin-permissions'

export interface AdminRoleBadgeProps {
  role: AdminRole
  size?: 'sm' | 'md'
  showGlow?: boolean
  className?: string
}

export function AdminRoleBadge({
  role,
  size = 'md',
  showGlow = true,
  className,
}: AdminRoleBadgeProps) {
  const styles = ADMIN_ROLE_STYLES[role]
  const label = ADMIN_ROLE_LABELS[role]

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        styles.bg,
        styles.text,
        // Only apply glow to super_admin and only if showGlow is true
        showGlow && styles.glow,
        // Size variants
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        className
      )}
    >
      {label}
    </span>
  )
}
```

Create rbac directory: admin-ui/src/components/rbac/
  </action>
  <verify>
File exists at admin-ui/src/components/rbac/AdminRoleBadge.tsx
TypeScript compiles: `cd admin-ui && npx tsc --noEmit`
  </verify>
  <done>AdminRoleBadge displays colored badge with role-specific styling including glow for super_admin</done>
</task>

<task type="auto">
  <name>Task 5: Create PermissionGate component</name>
  <files>admin-ui/src/components/rbac/PermissionGate.tsx</files>
  <action>
Create the PermissionGate component for conditional rendering:

```typescript
/**
 * Nebula DNS - Permission Gate Component
 * Wrapper for conditional rendering based on admin role
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { ReactNode } from 'react'
import { useAdminRole } from '@/hooks/useAdminRole'
import { AdminRole, ADMIN_PERMISSIONS } from '@/lib/admin-permissions'

export interface PermissionGateProps {
  /** Require a minimum role level */
  requiredRole?: AdminRole
  /** Require write permission (admin or super_admin) */
  requireWrite?: boolean
  /** Require super_admin role specifically */
  requireSuperAdmin?: boolean
  /** Check access to specific feature */
  feature?: keyof typeof ADMIN_PERMISSIONS
  /** Content to render if permission granted */
  children: ReactNode
  /** Optional fallback content if permission denied */
  fallback?: ReactNode
}

/**
 * Conditionally render children based on admin role permissions.
 * If permission is denied, renders fallback (default: null).
 *
 * @example
 * // Hide button for viewers
 * <PermissionGate requireWrite>
 *   <Button>Edit MSP</Button>
 * </PermissionGate>
 *
 * @example
 * // Only show for super_admin
 * <PermissionGate requireSuperAdmin>
 *   <AdminUsersLink />
 * </PermissionGate>
 */
export function PermissionGate({
  requiredRole,
  requireWrite,
  requireSuperAdmin,
  feature,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasMinRole, canWrite, isSuperAdmin, canAccess } = useAdminRole()

  // Check feature access
  if (feature && !canAccess(feature)) {
    return <>{fallback}</>
  }

  // Check super_admin requirement
  if (requireSuperAdmin && !isSuperAdmin) {
    return <>{fallback}</>
  }

  // Check write permission
  if (requireWrite && !canWrite) {
    return <>{fallback}</>
  }

  // Check minimum role
  if (requiredRole && !hasMinRole(requiredRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
```
  </action>
  <verify>
File exists at admin-ui/src/components/rbac/PermissionGate.tsx
TypeScript compiles: `cd admin-ui && npx tsc --noEmit`
  </verify>
  <done>PermissionGate enables conditional rendering based on role permissions</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. All new files exist in correct locations
2. TypeScript compiles without errors: `cd admin-ui && npx tsc --noEmit`
3. AdminRole type matches backend enum values
4. useAdminRole hook can be imported and used in components
5. AdminRoleBadge renders with correct colors per role
6. PermissionGate can wrap components for conditional rendering
</verification>

<success_criteria>
1. admin-permissions.ts exports AdminRole type, hierarchy, labels, and styles
2. AdminUser interface includes role property
3. useAdminRole hook provides isSuperAdmin, isAdmin, isViewer, canWrite, hasMinRole
4. AdminRoleBadge displays role-specific colors (red/glow for super_admin, blue for admin, gray for viewer)
5. PermissionGate can conditionally render based on role checks
</success_criteria>

<output>
After completion, create `.planning/phases/18-rbac-ui/18-01-SUMMARY.md`
</output>
