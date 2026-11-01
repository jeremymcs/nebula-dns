/**
 * Nebula DNS - Admin Permissions
 * Type definitions and permission matrix for admin role-based access control
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

/**
 * Admin role type matching backend AdminRole enum
 */
export type AdminRole = 'super_admin' | 'admin' | 'viewer'

/**
 * Role hierarchy for comparison (higher number = more permissions)
 */
export const ADMIN_ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 3,
  admin: 2,
  viewer: 1,
}

/**
 * Human-readable role labels
 */
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer',
}

/**
 * Badge styling per role
 */
export const ADMIN_ROLE_STYLES: Record<
  AdminRole,
  {
    bg: string
    text: string
    glow?: string
  }
> = {
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
}

/**
 * Permission matrix for navigation items and features
 */
export const ADMIN_PERMISSIONS = {
  dashboard: ['super_admin', 'admin', 'viewer'] as AdminRole[],
  msps: ['super_admin', 'admin', 'viewer'] as AdminRole[],
  tenants: ['super_admin', 'admin', 'viewer'] as AdminRole[],
  audit: ['super_admin', 'admin', 'viewer'] as AdminRole[],
  health: ['super_admin', 'admin', 'viewer'] as AdminRole[],
  'tenant-billing': ['super_admin', 'admin', 'viewer'] as AdminRole[],
  'tenant-billing-write': ['super_admin', 'admin'] as AdminRole[],
  'admin-users': ['super_admin'] as AdminRole[],
  'alerting-config': ['super_admin', 'admin'] as AdminRole[],
} as const

/**
 * Check if user has minimum required role level
 * @param userRole - Current user's role
 * @param requiredRole - Minimum required role
 * @returns true if user meets or exceeds required role
 */
export function hasMinimumRole(
  userRole: AdminRole,
  requiredRole: AdminRole
): boolean {
  return ADMIN_ROLE_HIERARCHY[userRole] >= ADMIN_ROLE_HIERARCHY[requiredRole]
}
