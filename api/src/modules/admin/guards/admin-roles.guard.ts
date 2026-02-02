// Nebula DNS - Admin Roles Guard
// Validates admin JWT roles against endpoint requirements
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../enums/admin-role.enum';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

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
 * Feature Flags:
 * - ADMIN_RBAC_ENABLED: When false (default), all authenticated admins have full access
 * - ADMIN_RBAC_SHADOW_MODE: When true (default), logs would-be denials without blocking
 *
 * Error Messages: Returns helpful 403 messages including the required role(s)
 * to aid debugging and provide clear feedback.
 */
@Injectable()
export class AdminRolesGuard implements CanActivate {
  private readonly logger = new Logger(AdminRolesGuard.name);

  // Synthetic tenant ID for admin audit logs (admins are not tenant-scoped)
  private readonly ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000000';

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private auditLogsService: AuditLogsService,
  ) {}

  /**
   * Check if the request can be activated based on admin role
   *
   * @param context - The execution context
   * @returns true if the admin has the required role
   * @throws ForbiddenException if role is missing or insufficient (when RBAC enabled and not in shadow mode)
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // Read feature flags
    const rbacEnabled = this.configService.get<boolean>(
      'admin.rbacEnabled',
      false,
    );
    const shadowMode = this.configService.get<boolean>(
      'admin.rbacShadowMode',
      true,
    );

    // Check if role would be denied
    const wouldBeDenied = !user?.role || !requiredRoles.includes(user.role);

    if (wouldBeDenied) {
      // Determine if this is an actual denial or shadow mode
      const isActualDenial = rbacEnabled && !shadowMode;

      // Log the RBAC decision
      await this.logRbacDecision(user, request, requiredRoles, isActualDenial);

      // If RBAC is disabled, allow access
      if (!rbacEnabled) {
        return true;
      }

      // If shadow mode is enabled, log but allow access
      if (shadowMode) {
        this.logger.warn(
          `Shadow mode: Would deny ${user?.email || 'unknown'} access to ${request.method} ${request.url} (requires ${requiredRoles.join(' or ')})`,
        );
        return true;
      }

      // RBAC enabled and shadow mode off - actually deny
      throw new ForbiddenException(
        `Requires ${requiredRoles.join(' or ')} role`,
      );
    }

    return true;
  }

  /**
   * Log RBAC decision to audit logs
   */
  private async logRbacDecision(
    user: any,
    request: any,
    requiredRoles: AdminRole[],
    isActualDenial: boolean,
  ): Promise<void> {
    try {
      await this.auditLogsService.log({
        tenantId: this.ADMIN_TENANT_ID,
        userId: null,
        action: isActualDenial ? 'rbac_denied' : 'rbac_shadow_denied',
        resourceType: 'admin',
        resourceId: user?.adminId || null,
        resourceName: user?.email || 'unknown',
        metadata: {
          method: request.method,
          path: request.url,
          requiredRoles,
          userRole: user?.role || null,
          shadowMode: !isActualDenial,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log RBAC decision', error);
    }
  }
}
