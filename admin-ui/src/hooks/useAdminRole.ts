/**
 * Nebula DNS - Admin Role Hook
 * React hook for checking admin role permissions in components
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  AdminRole,
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
