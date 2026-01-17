// Nebula DNS - JWT Strategy with Session Blacklist
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  jti?: string;
  mfaVerified?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Check if token JTI is blacklisted (session revoked)
    if (payload.jti) {
      const isBlacklisted = await this.authService.isTokenBlacklisted(
        payload.jti,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Session has been revoked');
      }
    }

    const user = await this.authService.validateUser(
      payload.sub,
      payload.tenantId,
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
    };
  }
}
