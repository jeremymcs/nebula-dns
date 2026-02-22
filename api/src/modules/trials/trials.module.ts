// Nebula DNS - Trials Module
// Module for tier upgrade trials (US-032, US-033)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrialsController } from './trials.controller';
import { TrialsService } from './trials.service';
import { TrialHistory } from './entities/trial-history.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { EmailModule } from '../email/email.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrialHistory, Tenant, Subscription]),
    EmailModule,
    PaymentsModule,
  ],
  controllers: [TrialsController],
  providers: [TrialsService],
  exports: [TrialsService],
})
export class TrialsModule {}
