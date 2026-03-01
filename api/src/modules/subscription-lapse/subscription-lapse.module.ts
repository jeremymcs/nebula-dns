// Nebula DNS - Subscription Lapse Module
// Handles MSP subscription lapse grace periods and notifications (US-028, US-029)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionLapseController } from './subscription-lapse.controller';
import { SubscriptionLapseService } from './subscription-lapse.service';
import { GracePeriodCheckJob } from './jobs/grace-period-check.job';
import { SendLapseNotificationsJob } from './jobs/send-lapse-notifications.job';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { MspClient } from '../msp-clients/entities/msp-client.entity';
import { EmailModule } from '../email/email.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, Subscription, MspClient]),
    ConfigModule,
    EmailModule,
    AuditLogsModule,
    RedisModule,
  ],
  controllers: [SubscriptionLapseController],
  providers: [
    SubscriptionLapseService,
    GracePeriodCheckJob,
    SendLapseNotificationsJob,
  ],
  exports: [SubscriptionLapseService],
})
export class SubscriptionLapseModule {}
