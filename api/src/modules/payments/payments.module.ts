/**
 * Nebula DNS - Enterprise DNS Security Platform
 * Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
 *
 * Payments Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmailModule } from '../email/email.module';
// US-028: Import subscription lapse module for grace period handling
import { SubscriptionLapseModule } from '../subscription-lapse/subscription-lapse.module';

@Module({
  imports: [
    forwardRef(() => SubscriptionsModule),
    EmailModule,
    SubscriptionLapseModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
