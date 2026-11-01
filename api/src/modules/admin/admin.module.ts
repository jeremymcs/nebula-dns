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

    // TypeORM entities for admin users and related entities for MSP drill-down
    TypeOrmModule.forFeature([
      Admin,
      AdminMfa,
      AdminInvitation,
      AdminActivityLog,
      Tenant,
      Location,
      User,
      Subscription,
      MspInvoice,
      AgentInstallation,
    ]),

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
  ],

  // Admin API endpoints
  controllers: [AdminController, AdminUsersController],

  // Services and strategy
  providers: [
    AdminService,
    AdminSessionService,
    AdminHealthService,
    AdminBillingService,
    AdminDashboardService,
    AdminActivityService,
    AdminUsersService,
    AdminInvitationsService,
    AdminMfaService,
    AdminJwtStrategy,
    AdminAuthGuard,
    AdminRolesGuard,
    AdminMfaGuard,
  ],

  // Export service and guard for use by other modules
  exports: [
    AdminService,
    AdminHealthService,
    AdminBillingService,
    AdminActivityService,
    AdminUsersService,
    AdminInvitationsService,
    AdminAuthGuard,
    AdminRolesGuard,
    JwtModule,
  ],
})
export class AdminModule {}
