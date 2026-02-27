// Nebula DNS - JWT Strategy with Session Blacklist
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RedisService } from '../redis/redis.service';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string; // User's display name (optional for backward compatibility)
  tenantId: string;
  role: string;
  jti?: string;
  mfaVerified?: boolean;
  // MSP context switch claims (US-007)
  mspParentTenantId?: string; // Original MSP tenant ID when switched to client
  mspUserId?: string; // Original MSP user ID for attribution
  tier?: string; // Client's tier when switched
  // Admin impersonation claims (US-019)
  impersonatingAdminId?: string; // Admin's ID when impersonating
  impersonatingAdminEmail?: string; // Admin's email for audit attribution
  impersonationStartTime?: number; // Unix timestamp when impersonation started
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    // Check if token JTI is blacklisted (session revoked)
    if (payload.jti) {
      let isBlacklisted: boolean;

      if (payload.impersonatingAdminId) {
        // Impersonation token - check admin session blacklist
        const blacklistKey = `admin:session:blacklist:${payload.jti}`;
        const result = await this.redisService.get(blacklistKey);
        isBlacklisted = result !== null;
      } else {
        // Normal token - check tenant session blacklist
        isBlacklisted = await this.authService.isTokenBlacklisted(payload.jti);
      }

      if (isBlacklisted) {
        throw new UnauthorizedException('Session has been revoked');
      }
    }

    // Handle impersonation tokens - admin acts as synthetic user
    // When impersonating, the admin is NOT a real user in the database
    if (payload.impersonatingAdminId) {
      // Return synthetic user object for impersonation
      // No database lookup needed - admin is impersonating
      return {
        id: payload.sub, // Admin's ID
        email: payload.email, // Admin's email
        name: payload.name, // Admin's name with "(Impersonating)" indicator
        tenantId: payload.tenantId, // Target tenant
        tier: payload.tier, // Tenant tier for dashboard features
        role: payload.role, // 'admin' for full tenant access
        jti: payload.jti,
        mfaVerified: payload.mfaVerified || true,
        mfaEnabled: true, // Impersonation sessions are considered MFA verified
        // Impersonation context for audit attribution
        isImpersonation: true,
        impersonatingAdminId: payload.impersonatingAdminId,
        impersonatingAdminEmail: payload.impersonatingAdminEmail,
        impersonationStartTime: payload.impersonationStartTime,
      };
    }

    // For MSP context switch tokens, validate user against MSP parent tenant
    // The user exists in the MSP tenant, not the client tenant they switched to
    const validationTenantId = payload.mspParentTenantId || payload.tenantId;

    const user = await this.authService.validateUser(
      payload.sub,
      validationTenantId,
    );

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
      jti: payload.jti,
      mfaVerified: payload.mfaVerified || false,
      // MSP context switch claims (US-007)
      mspParentTenantId: payload.mspParentTenantId,
      mspUserId: payload.mspUserId,
      tier: payload.tier,
      // Impersonation context (not set for normal users)
      isImpersonation: false,
    };
  }
}
