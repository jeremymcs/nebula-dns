// Nebula DNS - MSP Clients Module
// Module for managing MSP-to-client tenant relationships (US-005, US-006)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MspClient } from './entities/msp-client.entity';
import { MspClientsService } from './msp-clients.service';
import { MspClientsController } from './msp-clients.controller';
import { MspTierGuard } from './guards/msp-tier.guard';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { LimitsModule } from '../limits/limits.module';
import { BillingMeterModule } from '../billing-meter/billing-meter.module';
import { MspModule } from '../msp/msp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MspClient, Tenant, User]),
    LimitsModule,
    BillingMeterModule,
    forwardRef(() => MspModule),
  ],
  controllers: [MspClientsController],
  providers: [MspClientsService, MspTierGuard],
  exports: [MspClientsService, MspTierGuard],
})
export class MspClientsModule {}
