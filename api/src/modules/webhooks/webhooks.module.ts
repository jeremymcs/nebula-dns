// Nebula DNS - Webhooks Module with Secret Rotation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookIdempotencyKey } from './entities/webhook-idempotency.entity';
import { MetricsModule } from '../metrics/metrics.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, WebhookDelivery, WebhookIdempotencyKey]),
    MetricsModule,
    forwardRef(() => AuditLogsModule),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
