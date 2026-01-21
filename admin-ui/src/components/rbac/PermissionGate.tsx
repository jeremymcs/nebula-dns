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
