// Nebula DNS - MSP Billing Module
// Updated to use the unified tier system (US-022, US-023)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MspBillingController } from './msp-billing.controller';
import { MspBillingService } from './msp-billing.service';
import {
  QueryBundle,
  MspSubscription,
  MspPurchase,
  MspUsage,
  MspInvoice,
} from './entities';
// Partner entity removed - using unified tier system (US-022, US-023)
// MSP billing now uses Tenant with tier='msp' as the "partner"
import { Tenant } from '../tenants/entities/tenant.entity';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QueryBundle,
      MspSubscription,
      MspPurchase,
      MspUsage,
      MspInvoice,
      // Partner removed - using Tenant with tier='msp' instead
      Tenant,
    ]),
    ClickHouseModule,
    EmailModule,
  ],
  controllers: [MspBillingController],
  providers: [MspBillingService],
  exports: [MspBillingService],
})
export class MspBillingModule {}
