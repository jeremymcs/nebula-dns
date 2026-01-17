// Nebula DNS - Admin Module
// Separate authentication system for internal administrators
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from './entities/admin.entity';
import { AdminMfa } from './entities/admin-mfa.entity';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RedisModule } from '../redis/redis.module';

/**
 * Admin Module
 *
 * Provides a completely separate authentication system for internal administrators.
 * This module is intentionally isolated from tenant authentication:
 *
 * - Uses separate ADMIN_JWT_SECRET (not JWT_SECRET)
 * - Uses named strategy 'admin-jwt' (not default 'jwt')
 * - 8-hour session duration (workday sessions)
 * - Tokens have issuer 'nebula-admin' to distinguish from tenant tokens
 *
 * Current plan (01-01) implements:
 * - Admin and AdminMfa entities
 * - AdminJwtStrategy for token validation
 * - AdminAuthGuard for route protection
 *
 * Plan 02 (01-02) will add:
 * - AdminService for authentication logic
 * - AdminController for login/logout/MFA endpoints
 * - AdminSessionService for session management
 */
@Module({
  imports: [
    // Passport with admin-jwt as default strategy for this module
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),

    // JWT configuration with separate secret and 8-hour expiry
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn: '8h', // 8-hour workday session per CONTEXT.md
          issuer: 'nebula-admin', // Distinguishes from tenant tokens
        },
      }),
    }),

    // TypeORM entities for admin users
    TypeOrmModule.forFeature([Admin, AdminMfa]),

    // Redis for session management (blacklist, session tracking)
    RedisModule,
  ],

  // Controllers will be added in plan 02
  controllers: [],

  // Providers include strategy for token validation
  providers: [AdminJwtStrategy, AdminAuthGuard],

  // Exports will be expanded in plan 02 when AdminService is added
  exports: [AdminAuthGuard, JwtModule],
})
export class AdminModule {}
