// Nebula DNS - Admin Roles Decorator
// Decorator for specifying required admin roles on endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../enums/admin-role.enum';

/**
 * Metadata key for admin roles
 *
 * Distinct from tenant 'roles' key to prevent collision
 * between tenant RBAC and admin RBAC systems.
 */
export const ADMIN_ROLES_KEY = 'admin_roles';

/**
 * Admin Roles Decorator
 *
 * Attaches required admin roles to route handlers for authorization.
 * Used in conjunction with AdminRolesGuard.
 *
 * @param roles - One or more AdminRole values that can access this endpoint
 * @returns Method decorator with role metadata attached
 *
 * @example
 * // Super admin only
 * @AdminRoles(AdminRole.SUPER_ADMIN)
 * @Post('admins')
 * createAdmin() {}
 *
 * @example
 * // Admin or Super admin
 * @AdminRoles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
 * @Post('msp/tenants')
 * createMspTenant() {}
 *
 * @example
 * // All roles (read-only endpoint)
 * @AdminRoles(AdminRole.VIEWER, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
 * @Get('tenants/search')
 * searchTenants() {}
 */
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
