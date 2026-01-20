// Nebula DNS - Admin JWT Strategy
// Named passport strategy for admin authentication
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminJwtPayload, AdminUser } from '../dto/admin-jwt-payload.dto';
import { AdminService } from '../admin.service';

/**
 * Admin JWT Strategy - Named 'admin-jwt'
 *
 * This strategy is completely separate from the tenant JWT strategy:
 * - Uses ADMIN_JWT_SECRET (not JWT_SECRET)
 * - Validates issuer claim 'nebula-admin'
 * - Returns AdminUser object (not User)
 * - Checks token blacklist via AdminService
 *
 * All admin routes should use AdminAuthGuard which wraps this strategy.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ADMIN_JWT_SECRET'),
      issuer: 'nebula-admin',
    });
  }

  /**
   * Validate the JWT payload and return the admin user
   *
   * @param payload - The decoded JWT payload
   * @returns AdminUser object attached to request.user
   * @throws UnauthorizedException if validation fails
   */
  async validate(payload: AdminJwtPayload): Promise<AdminUser> {
    // Verify issuer claim matches expected value
    // This is critical for preventing tenant tokens from being accepted
    if (payload.iss !== 'nebula-admin') {
      throw new UnauthorizedException('Admin authentication required');
    }

    // Check if token JTI is blacklisted (session revoked)
    const isBlacklisted = await this.adminService.isTokenBlacklisted(
      payload.jti,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Session has been revoked');
    }

    // Verify admin still exists and is active
    const admin = await this.adminService.findById(payload.sub);
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    if (admin.status === 'suspended') {
      throw new UnauthorizedException('Admin account is suspended');
    }

    // Return admin user object to be attached to request.user
    return {
      adminId: payload.sub,
      email: payload.email,
      name: payload.name,
      mfaVerified: payload.mfaVerified,
      jti: payload.jti,
      role: payload.role,
    };
  }
}
