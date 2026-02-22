// Nebula DNS - Billing Meter Module
// Provides Stripe metered billing for locations and MSP clients
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BillingMeterService } from './billing-meter.service';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Location } from '../locations/entities/location.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Subscription, Tenant, Location]),
    AuditLogsModule,
  ],
  providers: [BillingMeterService],
  exports: [BillingMeterService],
})
export class BillingMeterModule {}
