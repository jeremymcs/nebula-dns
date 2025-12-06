import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
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
import { SecurityHeadersMiddleware, RateLimitMiddleware } from './common/middleware';

// P2 Features
import { BlockPagesModule } from './modules/block-pages/block-pages.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { SiemModule } from './modules/siem/siem.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
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
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl:
          configService.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    // Analytics
    ClickHouseModule,

    // Feature modules
    AuthModule,
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

    // Observability
    MetricsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware, RateLimitMiddleware, MetricsMiddleware)
      .forRoutes('*');
  }
}
