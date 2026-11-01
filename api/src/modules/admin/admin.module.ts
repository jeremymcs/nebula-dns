// Nebula DNS - Admin Module
// Separate authentication system for internal administrators
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from './entities/admin.entity';
import { AdminMfa } from './entities/admin-mfa.entity';
import { AdminInvitation } from './entities/admin-invitation.entity';
import { AdminActivityLog } from './entities/admin-activity-log.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { MspInvoice } from '../msp-billing/entities/msp-invoice.entity';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminService } from './admin.service';
import { AdminSessionService } from './admin-session.service';
import { AdminHealthService } from './admin-health.service';
import { AdminBillingService } from './admin-billing.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminActivityService } from './admin-activity.service';
import { AdminUsersService } from './admin-users.service';
import { AdminInvitationsService } from './admin-invitations.service';
import { AdminMfaService } from './admin-mfa.service';
import { AdminMfaGuard } from './guards/admin-mfa.guard';
import { AgentInstallation } from '../agents/entities/agent-installation.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { AdminTenantsService } from './admin-tenants.service';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminPlatformAuditService } from './admin-platform-audit.service';
import { AdminPlatformAuditController } from './admin-platform-audit.controller';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './admin-users.controller';
import { RedisModule } from '../redis/redis.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';
import { EmailModule } from '../email/email.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TrialsModule } from '../trials/trials.module';
import { SubscriptionLapseModule } from '../subscription-lapse/subscription-lapse.module';
import { AlertingModule } from '../alerting/alerting.module';
import { LimitsModule } from '../limits/limits.module';
import { AdminRefreshToken } from '../mobile/entities/admin-refresh-token.entity';
import { AdminRefreshTokenService } from '../mobile/admin-refresh-token.service';
import { MobileModule } from '../mobile/mobile.module';

/**
 * Admin Module
 *
 * Provides a completely separate authentication system for internal administrators.
 * This module is intentionally isolated from tenant authentication:
 *
 * - Uses separate ADMIN_JWT_SECRET (not JWT_SECRET)
 * - Uses named strategy 'admin-jwt' (not default 'jwt')
 * - 15-minute access tokens with rotating refresh tokens (mobile Phase 0)
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

    // JWT configuration with separate secret and 15-minute access TTL
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('ADMIN_JWT_EXPIRY') || '15m',
          issuer: 'nebula-admin', // Distinguishes from tenant tokens
        },
      }),
    }),

    // TypeORM entities for admin users and related entities for MSP drill-down
    TypeOrmModule.forFeature([
      Admin,
      AdminMfa,
      AdminInvitation,
      AdminActivityLog,
      AdminRefreshToken,
      Tenant,
      Location,
      User,
      Subscription,
      MspInvoice,
      AgentInstallation,
      AuditLog,
    ]),

    LimitsModule,

    // Redis for session management (blacklist, session tracking)
    RedisModule,

    // Audit logs for impersonation tracking
    AuditLogsModule,

    // ClickHouse for usage metrics aggregation
    ClickHouseModule,

    // Email for MSP welcome notifications
    EmailModule,

    // Billing-related modules for admin billing operations
    PaymentsModule,
    SubscriptionsModule,
    TrialsModule,
    SubscriptionLapseModule,
    AlertingModule,
    forwardRef(() => MobileModule),
  ],

  // Admin API endpoints
  controllers: [
    AdminTenantsController,
    AdminPlatformAuditController,
    AdminController,
    AdminUsersController,
  ],

  // Services and strategy
  providers: [
    AdminService,
    AdminSessionService,
    AdminRefreshTokenService,
    AdminHealthService,
    AdminBillingService,
    AdminDashboardService,
    AdminActivityService,
    AdminUsersService,
    AdminInvitationsService,
    AdminMfaService,
    AdminTenantsService,
    AdminPlatformAuditService,
    AdminJwtStrategy,
    AdminAuthGuard,
    AdminRolesGuard,
    AdminMfaGuard,
  ],

  // Export service and guard for use by other modules
  exports: [
    AdminService,
    AdminSessionService,
    AdminRefreshTokenService,
    AdminHealthService,
    AdminBillingService,
    AdminActivityService,
    AdminUsersService,
    AdminInvitationsService,
    AdminTenantsService,
    AdminPlatformAuditService,
    AdminAuthGuard,
    AdminRolesGuard,
    JwtModule,
  ],
})
export class AdminModule {}
