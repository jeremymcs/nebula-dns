// Nebula DNS - Admin Auth Guard
// Protects admin routes using admin-jwt strategy
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Admin Authentication Guard
 *
 * Uses the named 'admin-jwt' strategy to authenticate admin requests.
 * Returns a specific error message "Admin authentication required" to
 * distinguish from regular authentication failures.
 *
 * Usage:
 * ```typescript
 * @UseGuards(AdminAuthGuard)
 * @Controller('admin/dashboard')
 * export class AdminDashboardController {}
 * ```
 */
@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {
  /**
   * Check if the request can be activated
   *
   * @param context - The execution context
   * @returns true if authentication succeeds
   */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Handle the authentication result
   *
   * Returns a specific error message for admin routes to aid debugging
   * and distinguish from tenant authentication failures.
   *
   * @param err - Any error that occurred during authentication
   * @param user - The authenticated user (AdminUser) or undefined
   * @param info - Additional info from the strategy (e.g., expired token)
   * @returns The authenticated AdminUser
   * @throws UnauthorizedException with admin-specific message
   */
  handleRequest(err: any, user: any, info: any) {
    // If there's an error or no user, throw admin-specific exception
    if (err || !user) {
      // Include additional context for debugging in development
      const message = 'Admin authentication required';

      throw new UnauthorizedException(message);
    }

    return user;
  }
}
