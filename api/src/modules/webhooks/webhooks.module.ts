// Nebula DNS - Webhooks Module
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, WebhookDelivery]),
    MetricsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
