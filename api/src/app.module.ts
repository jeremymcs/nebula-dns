import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ListsModule } from './modules/lists/lists.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthModule } from './modules/health/health.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { EmailModule } from './modules/email/email.module';
import { MfaModule } from './modules/mfa/mfa.module';
import { ScheduledReportsModule } from './modules/scheduled-reports/scheduled-reports.module';
import { SsoModule } from './modules/sso/sso.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ClickHouseModule } from './modules/clickhouse/clickhouse.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { MetricsMiddleware } from './modules/metrics/metrics.middleware';
import {
  SecurityHeadersMiddleware,
  RateLimitMiddleware,
} from './common/middleware';
import { SentryModule, SentryInterceptor } from './common/sentry/sentry.module';
import { LoggerModule } from './common/logger/logger.module';
import { RedisModule } from './modules/redis/redis.module';

// P2 Features
import { BlockPagesModule } from './modules/block-pages/block-pages.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { SiemModule } from './modules/siem/siem.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DoHModule } from './modules/doh/doh.module';

// MSP/SaaS Multi-tenant
// NOTE: PartnersModule has been deprecated and removed (US-022, US-023)
// All partner functionality is now handled by the unified tier system via MspModule
// See docs/msp-migration-guide.md for migration details
import { MspModule } from './modules/msp/msp.module';
import { MspBillingModule } from './modules/msp-billing/msp-billing.module';
import { MspClientsModule } from './modules/msp-clients/msp-clients.module';

// Audit Logging
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';

// Security Automation
import { PlaybooksModule } from './modules/playbooks/playbooks.module';
import { PolicyTemplatesModule } from './modules/policy-templates/policy-templates.module';

// Family Mode
import { FamilyModule } from './modules/family/family.module';

// Onboarding
import { OnboardingModule } from './modules/onboarding/onboarding.module';

// Distributed Rate Limiting
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';

// Secrets Management
import { SecretsModule } from './modules/secrets/secrets.module';

// Subscription Plan Limits
import { SubscriptionPlansModule } from './modules/subscription-plans/subscription-plans.module';

// Billing Meter (Stripe metered billing for locations/clients)
import { BillingMeterModule } from './modules/billing-meter/billing-meter.module';

// Tier Upgrade Trials (US-032, US-033)
import { TrialsModule } from './modules/trials/trials.module';

// Subscription Lapse (US-027, US-028, US-029)
import { SubscriptionLapseModule } from './modules/subscription-lapse/subscription-lapse.module';

// Configuration
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
      validate: (config) => {
        // Only validate in production for required vars
        if (process.env.NODE_ENV === 'production') {
          const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'];
          for (const key of required) {
            if (!config[key]) {
              throw new Error(`Missing required environment variable: ${key}`);
            }
          }
        }
        return config;
      },
    }),

    // Task Scheduling
    ScheduleModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // NEVER use synchronize in production - use migrations instead
        synchronize: false,
        migrationsRun: configService.get<string>('NODE_ENV') === 'production',
        migrations: ['dist/database/migrations/*.js'],
        logging:
          configService.get<string>('NODE_ENV') === 'development'
            ? true
            : ['error'],
        ssl:
          configService.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
        // Connection pooling
        extra: {
          max: configService.get<number>('DB_POOL_SIZE', 20),
          connectionTimeoutMillis: configService.get<number>(
            'DB_CONNECTION_TIMEOUT',
            5000,
          ),
          idleTimeoutMillis: configService.get<number>(
            'DB_IDLE_TIMEOUT',
            30000,
          ),
        },
      }),
    }),

    // Analytics
    ClickHouseModule,

    // Redis (global)
    RedisModule,

    // Feature modules
    AuthModule,
    AdminModule, // Separate admin authentication system (Phase 1)
    TenantsModule,
    UsersModule,
    PoliciesModule,
    LocationsModule,
    ListsModule,
    ReportsModule,
    HealthModule,
    SubscriptionsModule,
    EmailModule,

    // P1 Features
    MfaModule,
    ScheduledReportsModule,
    SsoModule,
    AgentsModule,

    // P2 Features
    BlockPagesModule,
    ApiKeysModule,
    InvitationsModule,
    SiemModule,
    WebhooksModule,
    PaymentsModule,

    // DNS-over-HTTPS for agents
    DoHModule,

    // MSP/SaaS Multi-tenant (Unified Tier System)
    // PartnersModule removed - see docs/msp-migration-guide.md
    MspModule,
    MspBillingModule,
    MspClientsModule,

    // Observability & Logging
    MetricsModule,
    SentryModule.forRootAsync(),
    LoggerModule,

    // Audit Logging
    AuditLogsModule,

    // Security Automation
    PlaybooksModule,
    PolicyTemplatesModule,

    // Family Mode
    FamilyModule,

    // Onboarding
    OnboardingModule,

    // Distributed Rate Limiting (Redis-backed)
    RateLimitModule,

    // Secrets Management (AWS/Vault/env)
    SecretsModule,

    // Subscription Plan Limits (tier-based billing)
    SubscriptionPlansModule,

    // Billing Meter (Stripe metered billing for locations/clients)
    BillingMeterModule,

    // Tier Upgrade Trials (US-032, US-033)
    TrialsModule,

    // Subscription Lapse (US-027, US-028, US-029)
    SubscriptionLapseModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware, RateLimitMiddleware, MetricsMiddleware)
      .forRoutes('*');
  }
}
