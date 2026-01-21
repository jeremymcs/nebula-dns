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
