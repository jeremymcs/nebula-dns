// Nebula DNS - Admin Role Enum
// Defines the three-tier admin role system for RBAC
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Admin Role Enum
 *
 * Defines the three roles available to admin users:
 * - SUPER_ADMIN: Full system access, can manage other admins
 * - ADMIN: Standard operations access, can manage tenants/MSPs
 * - VIEWER: Read-only access to all data
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

/**
 * Role Hierarchy Levels
 *
 * Higher number = more permissions.
 * Used for comparing role privileges (e.g., preventing self-escalation).
 */
export const ADMIN_ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.SUPER_ADMIN]: 3,
  [AdminRole.ADMIN]: 2,
  [AdminRole.VIEWER]: 1,
};

/**
 * Check if a user role meets the minimum required role level
 *
 * @param userRole - The role of the current user
 * @param requiredRole - The minimum required role
 * @returns true if userRole has equal or higher privileges than requiredRole
 *
 * @example
 * hasMinimumRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN) // true
 * hasMinimumRole(AdminRole.VIEWER, AdminRole.ADMIN) // false
 * hasMinimumRole(AdminRole.ADMIN, AdminRole.ADMIN) // true
 */
export function hasMinimumRole(
  userRole: AdminRole,
  requiredRole: AdminRole,
): boolean {
  return ADMIN_ROLE_HIERARCHY[userRole] >= ADMIN_ROLE_HIERARCHY[requiredRole];
}
