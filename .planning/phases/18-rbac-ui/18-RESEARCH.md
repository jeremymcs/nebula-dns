# Phase 18: RBAC UI - Research

// Nebula DNS Admin Dashboard - Phase 18 Research
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

**Researched:** 2026-01-21
**Domain:** React RBAC UI, Next.js Route Protection, Role-Based Navigation
**Confidence:** HIGH

## Summary

The Nebula DNS UI codebase already has established patterns for conditional rendering based on tenant tiers (`useTierFeatures` hook, `hasFeature` function, navigation filtering). This phase extends these patterns to support admin roles (super_admin, admin, viewer) from the Phase 17 backend. The existing infrastructure provides a solid foundation.

Key implementation requirements:
1. Create `AdminRoleBadge` component with role-specific colors (Red=Super Admin, Blue=Admin, Gray=Viewer)
2. Extend `AuthContext` to include admin role from JWT payload
3. Create `useAdminRole` hook for role checking
4. Update `TopNav` to display role badge and filter navigation by role permissions
5. Add route protection with redirect and toast notification
6. Hide mutating actions (buttons, forms) from viewers

**Primary recommendation:** Follow the existing tier-based access pattern (useTierFeatures) but create admin-specific versions (useAdminRole, hasAdminPermission) to maintain separation between tenant tier features and admin role permissions.

## Standard Stack

The codebase already has all required dependencies.

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^16.1.1 | App router, routing | Framework |
| React | ^18.2.0 | UI components | Framework |
| @headlessui/react | ^1.7.18 | Accessible dropdowns/menus | Existing pattern |
| framer-motion | ^12.23.26 | Animations | Existing pattern |
| clsx | ^2.1.0 | Conditional classes | Existing pattern |

### Supporting (Already in Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @heroicons/react | ^2.1.1 | Icons | Badge icons |
| Tailwind CSS | ^3.4.1 | Styling | Role colors |

### No New Dependencies Required
All existing libraries support the RBAC UI requirements.

## Architecture Patterns

### Existing UI Structure
```
ui/src/
├── contexts/
│   └── AuthContext.tsx         # User auth + tier info (needs role)
├── hooks/
│   ├── useTierFeatures.tsx     # Tier-based feature checks (pattern to follow)
│   └── useAdminRole.ts         # NEW: Admin role checks
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx          # Header with user menu (needs role badge)
│   │   ├── MobileNav.tsx       # Mobile navigation (needs role filtering)
│   │   └── NavigationConfig.ts # Nav items (needs role-based filtering)
│   ├── ui/
│   │   └── Badge.tsx           # Existing badge component (needs AdminRoleBadge)
│   ├── Toast.tsx               # Toast notifications (use for access denied)
│   └── rbac/                   # NEW: RBAC UI components
│       ├── AdminRoleBadge.tsx  # Role badge with colors
│       ├── PermissionGate.tsx  # Wrapper for permission-based rendering
│       └── RequireRole.tsx     # Route protection component
├── lib/
│   ├── tier-features.ts        # Tier feature definitions (pattern to follow)
│   └── admin-permissions.ts    # NEW: Admin role permission definitions
└── app/
    └── dashboard/              # Protected routes
```

### Pattern 1: Admin Role Type Definition
**What:** Define admin roles as TypeScript type matching backend enum
**When to use:** All role-related code
**Example:**
```typescript
// Source: Phase 17 backend AdminRole enum
export type AdminRole = 'super_admin' | 'admin' | 'viewer';

export const ADMIN_ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 3,
  admin: 2,
  viewer: 1,
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer',
};
```

### Pattern 2: Extended AuthContext with Admin Role
**What:** Add adminRole to AuthContext user object
**When to use:** When user logs in, role comes from JWT
**Example:**
```typescript
// Source: Existing AuthContext.tsx pattern
interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'analyst' | 'readonly'; // Tenant role
  adminRole?: AdminRole; // NEW: Admin role if user is admin
  tenantId: string;
  tenantTier?: TenantTier;
}
```

### Pattern 3: useAdminRole Hook
**What:** Hook for checking admin role permissions
**When to use:** Components that need role-based rendering
**Example:**
```typescript
// Source: Existing useTierFeatures pattern
export function useAdminRole() {
  const { user } = useAuth();

  const adminRole = user?.adminRole;
  const isSuperAdmin = adminRole === 'super_admin';
  const isAdmin = adminRole === 'admin' || isSuperAdmin;
  const isViewer = adminRole === 'viewer';

  const canWrite = isSuperAdmin || (adminRole === 'admin');
  const canManageAdmins = isSuperAdmin;

  const hasMinimumRole = (required: AdminRole): boolean => {
    if (!adminRole) return false;
    return ADMIN_ROLE_HIERARCHY[adminRole] >= ADMIN_ROLE_HIERARCHY[required];
  };

  return {
    adminRole,
    isSuperAdmin,
    isAdmin,
    isViewer,
    canWrite,
    canManageAdmins,
    hasMinimumRole,
  };
}
```

### Pattern 4: AdminRoleBadge Component
**What:** Colored badge showing current admin role
**When to use:** Header and profile dropdown
**Example:**
```typescript
// Source: CONTEXT.md decisions
const ROLE_BADGE_STYLES: Record<AdminRole, { bg: string; text: string; glow?: string }> = {
  super_admin: {
    bg: 'bg-danger-100 dark:bg-danger-900/30',
    text: 'text-danger-700 dark:text-danger-300',
    glow: 'ring-2 ring-danger-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]',
  },
  admin: {
    bg: 'bg-accent-100 dark:bg-accent-900/30',
    text: 'text-accent-700 dark:text-accent-300',
  },
  viewer: {
    bg: 'bg-space-100 dark:bg-space-800',
    text: 'text-space-600 dark:text-space-400',
  },
};
```

### Pattern 5: PermissionGate Component (HasAccess Pattern)
**What:** Wrapper component for conditional rendering
**When to use:** Around UI elements that require specific roles
**Example:**
```typescript
// Source: React RBAC best practices
interface PermissionGateProps {
  requiredRole?: AdminRole;
  canWrite?: boolean; // Shortcut for admin+ role
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ requiredRole, canWrite, children, fallback }: PermissionGateProps) {
  const { hasMinimumRole, canWrite: userCanWrite } = useAdminRole();

  if (canWrite && !userCanWrite) {
    return fallback ?? null;
  }

  if (requiredRole && !hasMinimumRole(requiredRole)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}
```

### Pattern 6: Route Protection with Toast
**What:** Redirect unauthorized users with notification
**When to use:** Page-level protection
**Example:**
```typescript
// Source: CONTEXT.md decisions + existing useTierFeatures pattern
export function useRequireAdminRole(requiredRole: AdminRole) {
  const { hasMinimumRole, adminRole } = useAdminRole();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (adminRole && !hasMinimumRole(requiredRole)) {
      showToast('warning', 'Access Denied', "You don't have permission to access that page");
      router.push('/dashboard');
    }
  }, [adminRole, requiredRole, hasMinimumRole, router, showToast]);

  return hasMinimumRole(requiredRole);
}
```

### Anti-Patterns to Avoid
- **Checking roles inline everywhere:** Use PermissionGate wrapper or useAdminRole hook
- **Hiding navigation without route protection:** Direct URL access must also be blocked
- **Showing disabled buttons to viewers:** Hide entirely per CONTEXT.md decision
- **Frontend-only security:** Backend already enforces via AdminRolesGuard (Phase 17)
- **Mixing tier features and admin roles:** Keep separate - tiers control features, roles control permissions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Badge styling | Custom CSS per role | Tailwind utility classes with config object | Consistent, maintainable |
| Toast notifications | Custom notification system | Existing Toast.tsx + useToast hook | Already built, animated |
| Navigation filtering | Manual array filtering | Existing getNavigationForTier pattern | Proven pattern |
| Route protection | Custom redirect logic | useEffect + router.push pattern | Existing in useTierFeatures |
| Conditional classes | String concatenation | clsx library | Already in use |

**Key insight:** The existing tier-based access pattern in useTierFeatures.tsx is the template. Admin role checks follow the same architecture but with different permission logic.

## Common Pitfalls

### Pitfall 1: JWT Role Stale After Backend Change
**What goes wrong:** Admin's role changed but old JWT still has old role
**Why it happens:** JWT payload is immutable until refresh
**How to avoid:** Backend invalidates sessions on role change (Phase 17); UI refreshes on 401/403
**Warning signs:** User sees old role badge, can access pages they shouldn't

### Pitfall 2: Navigation State Mismatch
**What goes wrong:** Navigation shows items user can't actually access
**Why it happens:** Navigation filters by one check, route protection by another
**How to avoid:** Single source of truth for role permissions (admin-permissions.ts)
**Warning signs:** User clicks nav item, gets redirected immediately

### Pitfall 3: Toast on Initial Load
**What goes wrong:** Access denied toast shows on page refresh/initial load
**Why it happens:** Role check runs before auth state is hydrated
**How to avoid:** Wait for `loading === false` before checking permissions
**Warning signs:** Toast appears every page load, then disappears

### Pitfall 4: Mobile Navigation Forgotten
**What goes wrong:** Desktop nav filtered, mobile nav shows all items
**Why it happens:** MobileNav.tsx not updated with same filtering logic
**How to avoid:** Both TopNav and MobileNav must use same permission check
**Warning signs:** Mobile users see more items than desktop

### Pitfall 5: Profile Dropdown Missing Role Info
**What goes wrong:** Role badge in header but dropdown has no role details
**Why it happens:** User menu code not updated with permissions list
**How to avoid:** CONTEXT.md requires both header badge AND dropdown permissions
**Warning signs:** User sees badge but doesn't understand what permissions they have

### Pitfall 6: Form Submissions Still Working
**What goes wrong:** Viewer can't see edit button but API accepts form data
**Why it happens:** Frontend hides button but form action not protected
**How to avoid:** Backend AdminRolesGuard (Phase 17) is the actual enforcement
**Warning signs:** Clever users can POST to mutating endpoints

## Code Examples

Verified patterns from official sources and existing codebase.

### AdminRoleBadge Component
```typescript
// Source: Existing Badge.tsx pattern + CONTEXT.md decisions
import clsx from 'clsx';
import { AdminRole, ADMIN_ROLE_LABELS } from '@/lib/admin-permissions';

const ROLE_STYLES: Record<AdminRole, string> = {
  super_admin: clsx(
    'bg-danger-100 dark:bg-danger-900/30',
    'text-danger-700 dark:text-danger-300',
    'ring-2 ring-danger-500/50',
    'shadow-[0_0_8px_rgba(239,68,68,0.3)]'
  ),
  admin: clsx(
    'bg-accent-100 dark:bg-accent-900/30',
    'text-accent-700 dark:text-accent-300'
  ),
  viewer: clsx(
    'bg-space-100 dark:bg-space-800',
    'text-space-600 dark:text-space-400'
  ),
};

interface AdminRoleBadgeProps {
  role: AdminRole;
  size?: 'sm' | 'md';
  className?: string;
}

export function AdminRoleBadge({ role, size = 'md', className }: AdminRoleBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        ROLE_STYLES[role],
        className
      )}
    >
      {ADMIN_ROLE_LABELS[role]}
    </span>
  );
}
```

### Navigation Filtering by Role
```typescript
// Source: Existing getNavigationForTier pattern
import { AdminRole, ADMIN_ROLE_HIERARCHY } from '@/lib/admin-permissions';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType;
  requiredRole?: AdminRole;
  writeOnly?: boolean; // Only show if user can write
}

export function filterNavigationByRole(
  items: NavItem[],
  userRole: AdminRole | undefined
): NavItem[] {
  if (!userRole) return [];

  const userLevel = ADMIN_ROLE_HIERARCHY[userRole];
  const canWrite = userLevel >= ADMIN_ROLE_HIERARCHY['admin'];

  return items.filter(item => {
    // Write-only items hidden from viewers
    if (item.writeOnly && !canWrite) return false;

    // Check required role
    if (item.requiredRole) {
      const requiredLevel = ADMIN_ROLE_HIERARCHY[item.requiredRole];
      if (userLevel < requiredLevel) return false;
    }

    return true;
  });
}
```

### Updated TopNav User Menu with Role Badge
```typescript
// Source: Existing TopNav.tsx Menu.Items pattern
<Menu.Items className="...">
  <div className="px-3 py-2 border-b border-space-100 dark:border-space-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-space-900 dark:text-white">{user?.name}</p>
        <p className="text-xs text-space-500 dark:text-space-400 truncate">{user?.email}</p>
      </div>
      {user?.adminRole && (
        <AdminRoleBadge role={user.adminRole} size="sm" />
      )}
    </div>

    {/* Permissions list for dropdown */}
    {user?.adminRole && (
      <div className="mt-2 pt-2 border-t border-space-100 dark:border-space-700">
        <p className="text-xs font-medium text-space-500 dark:text-space-400 uppercase tracking-wide mb-1">
          Permissions
        </p>
        <ul className="text-xs text-space-600 dark:text-space-400 space-y-0.5">
          {user.adminRole === 'super_admin' && (
            <>
              <li>Manage admin users</li>
              <li>All admin operations</li>
            </>
          )}
          {(user.adminRole === 'super_admin' || user.adminRole === 'admin') && (
            <>
              <li>Create and edit resources</li>
              <li>Impersonate tenants</li>
            </>
          )}
          <li>View all data</li>
        </ul>
      </div>
    )}
  </div>
  {/* ... rest of menu items */}
</Menu.Items>
```

### Route Protection Hook
```typescript
// Source: Existing useRequireFeature pattern
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { AdminRole, ADMIN_ROLE_HIERARCHY } from '@/lib/admin-permissions';

export function useRequireAdminRole(requiredRole: AdminRole) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const adminRole = user?.adminRole;
  const hasAccess = adminRole
    ? ADMIN_ROLE_HIERARCHY[adminRole] >= ADMIN_ROLE_HIERARCHY[requiredRole]
    : false;

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    // No admin role = not an admin user
    if (!adminRole) {
      router.push('/dashboard');
      return;
    }

    // Check permission
    if (!hasAccess) {
      showToast('warning', 'Access Denied', "You don't have permission to access that page");
      router.push('/dashboard');
    }
  }, [loading, adminRole, hasAccess, router, showToast]);

  return { hasAccess, loading };
}
```

### API 403 Error Handling
```typescript
// Source: Existing useApi error handling pattern
const handleApiError = (error: ApiError) => {
  if (error.status === 403) {
    // Check if it's a page load or form submission
    if (isPageLoad) {
      showToast('warning', 'Access Denied', "You don't have permission to access that resource");
      router.push('/dashboard');
    } else {
      // Form submission - show inline error
      setFormError('You do not have permission to perform this action');
    }
    return;
  }
  // ... handle other errors
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Disabled buttons | Hidden buttons | 2024+ | Cleaner UX per CONTEXT.md |
| String role checks | TypeScript union types | Always | Type safety |
| HOC wrappers | Hooks + conditional render | React 18+ | Simpler, composable |
| Middleware-only protection | Client redirect + toast | Modern UX | Better feedback |

**Deprecated/outdated:**
- Class components with role checks: Use hooks
- Redux for auth state: Context is sufficient for this scope
- Browser middleware.ts for auth: Already using client-side protection

## Permission Matrix

Based on Phase 17 backend implementation, the UI should enforce:

### Navigation Items by Role
| Navigation Item | Super Admin | Admin | Viewer |
|-----------------|-------------|-------|--------|
| Dashboard | Yes | Yes | Yes |
| Tenant Search | Yes | Yes | Yes |
| MSP Management | Yes | Yes | Yes (read) |
| System Health | Yes | Yes | Yes |
| Billing Management | Yes | Yes | Yes (read) |
| Admin Users | Yes | No | No |
| System Config | Yes | No | No |

### Action Buttons by Role
| Action | Super Admin | Admin | Viewer |
|--------|-------------|-------|--------|
| Create MSP Tenant | Yes | Yes | Hidden |
| Impersonate | Yes | Yes | Hidden |
| Apply Credits | Yes | Yes | Hidden |
| Extend Trial | Yes | Yes | Hidden |
| Change Tier | Yes | Yes | Hidden |
| Create Admin | Yes | Hidden | Hidden |
| Change Admin Role | Yes | Hidden | Hidden |
| Delete Admin | Yes | Hidden | Hidden |

## Open Questions

Things that couldn't be fully resolved:

1. **Viewer read-only reminder beyond badge**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - What's unclear: Whether viewers need a persistent reminder they're read-only
   - Recommendation: Subtle gray text under dashboard title: "Viewing in read-only mode"

2. **Sidebar visual treatment for access levels**
   - What we know: Hidden items are preferred over disabled
   - What's unclear: Whether to show any visual indicator of "more items exist"
   - Recommendation: No indicator - cleaner UX, users don't miss what they don't see

3. **Exact toast message wording**
   - What we know: Should indicate access denied, CONTEXT.md allows generic or specific
   - What's unclear: Whether to mention the specific required role
   - Recommendation: Generic message "You don't have permission to access that page" - simpler

## Sources

### Primary (HIGH confidence)
- Existing codebase: `ui/src/hooks/useTierFeatures.tsx` - Pattern for role checking hooks
- Existing codebase: `ui/src/contexts/AuthContext.tsx` - User state management
- Existing codebase: `ui/src/components/layout/TopNav.tsx` - Navigation structure
- Existing codebase: `ui/src/components/ui/Badge.tsx` - Badge component pattern
- Existing codebase: `ui/src/components/Toast.tsx` - Toast notification system
- Phase 17 Research: `.planning/phases/17-rbac-foundation-backend/17-RESEARCH.md` - Backend role structure

### Secondary (MEDIUM confidence)
- [React RBAC Patterns](https://www.permit.io/blog/implementing-react-rbac-authorization) - HasAccess wrapper pattern
- [Next.js RBAC Guide](https://medium.com/@nakiboddin.saiyad/role-based-access-control-rbac-in-next-js-projects-93addde77b16) - Middleware and route protection
- [React-admin RBAC](https://marmelab.com/react-admin/AuthRBAC.html) - Permission gate patterns
- [Next.js Admin Panel RBAC](https://eastondev.com/blog/en/posts/dev/20260107-nextjs-rbac-admin-guide/) - Complete admin panel guide

### Tertiary (LOW confidence)
- None required - patterns well-established in codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing libraries
- Architecture: HIGH - Following existing codebase patterns
- Pitfalls: HIGH - Based on existing patterns and Phase 17 research
- Code examples: HIGH - Adapted from existing codebase

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - stable patterns)

---

## Implementation Notes for Planner

### Existing Infrastructure Summary
1. **AuthContext.tsx**: Needs `adminRole` property on User interface
2. **TopNav.tsx**: Needs role badge in header + dropdown permissions list
3. **MobileNav.tsx**: Needs same filtering as TopNav
4. **Toast.tsx**: Already supports warning toasts for access denied
5. **Badge.tsx**: Has RoleBadge for tenant roles, needs AdminRoleBadge

### New Files Required
1. `ui/src/lib/admin-permissions.ts` - Admin role types and permission definitions
2. `ui/src/hooks/useAdminRole.ts` - Admin role checking hook
3. `ui/src/components/rbac/AdminRoleBadge.tsx` - Role badge with colors
4. `ui/src/components/rbac/PermissionGate.tsx` - Conditional rendering wrapper

### Files to Modify
1. `ui/src/contexts/AuthContext.tsx` - Add adminRole to User interface
2. `ui/src/components/layout/TopNav.tsx` - Add badge, filter nav, dropdown permissions
3. `ui/src/components/layout/MobileNav.tsx` - Filter nav items by role
4. `ui/src/components/layout/NavigationConfig.ts` - Add role requirements to nav items

### CSS/Styling Notes
- Super Admin badge: `danger` colors (red) + glow effect using existing `shadow-glow` pattern
- Admin badge: `accent` colors (blue/cyan)
- Viewer badge: `space` colors (gray)
- Use existing Tailwind color palette from tailwind.config.ts
