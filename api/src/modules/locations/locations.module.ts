// Nebula DNS - Locations Module
// Manages network locations for DNS policy enforcement
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Location } from './entities/location.entity';
import { LocationToken } from './entities/location-token.entity';
import { PoliciesModule } from '../policies/policies.module';
import { LimitsModule } from '../limits/limits.module';
import { BillingMeterModule } from '../billing-meter/billing-meter.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Location, LocationToken]),
    ConfigModule,
    forwardRef(() => PoliciesModule),
    LimitsModule,
    BillingMeterModule,
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
