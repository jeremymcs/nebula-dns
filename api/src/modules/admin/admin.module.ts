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
import { Tenant } from '../tenants/entities/tenant.entity';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminService } from './admin.service';
import { AdminSessionService } from './admin-session.service';
import { AdminController } from './admin.controller';
import { RedisModule } from '../redis/redis.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

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
 * Components:
 * - Admin and AdminMfa entities (non-tenant-scoped)
 * - AdminJwtStrategy for token validation with blacklist checking
 * - AdminAuthGuard for route protection
 * - AdminService for authentication logic
 * - AdminSessionService for Redis session management
 * - AdminController for login/logout/profile endpoints
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
    TypeOrmModule.forFeature([Admin, AdminMfa, Tenant]),

    // Redis for session management (blacklist, session tracking)
    RedisModule,

    // Audit logs for impersonation tracking
    AuditLogsModule,
  ],

  // Admin API endpoints
  controllers: [AdminController],

  // Services and strategy
  providers: [
    AdminService,
    AdminSessionService,
    AdminJwtStrategy,
    AdminAuthGuard,
  ],

  // Export service and guard for use by other modules
  exports: [AdminService, AdminAuthGuard, JwtModule],
})
export class AdminModule {}
