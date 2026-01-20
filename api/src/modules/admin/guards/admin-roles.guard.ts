// Nebula DNS - Admin Roles Guard
// Validates admin JWT roles against endpoint requirements
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../enums/admin-role.enum';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';

/**
 * Admin Roles Guard
 *
 * Enforces role-based access control for admin endpoints.
 * Reads required roles from @AdminRoles() decorator metadata
 * and compares against the authenticated admin's role from JWT.
 *
 * Must be used AFTER AdminAuthGuard in the guard chain:
 * ```typescript
 * @UseGuards(AdminAuthGuard, AdminRolesGuard)
 * ```
 *
 * Default Policy: If no @AdminRoles() decorator is present on an endpoint,
 * access is allowed to all authenticated admins. This means unannotated
 * endpoints are accessible to any admin with a valid JWT.
 *
 * Error Messages: Returns helpful 403 messages including the required role(s)
 * to aid debugging and provide clear feedback.
 */
@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Check if the request can be activated based on admin role
   *
   * @param context - The execution context
   * @returns true if the admin has the required role
   * @throws ForbiddenException if role is missing or insufficient
   */
  canActivate(context: ExecutionContext): boolean {
    // Read required roles from handler or class decorator
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Default policy: if no roles specified, allow access
    // This means unannotated endpoints are accessible to all authenticated admins
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Ensure user exists and has a role (should always be true after AdminAuthGuard)
    if (!user?.role) {
      throw new ForbiddenException('Admin role not found in token');
    }

    // Check if user's role is in the list of allowed roles
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Requires ${requiredRoles.join(' or ')} role`,
      );
    }

    return true;
  }
}
