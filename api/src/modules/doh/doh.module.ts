/**
 * Nebula DNS - Enterprise DNS Security Platform
 * DNS-over-HTTPS (DoH) Module
 * 
 * Handles DoH requests from agents and provides policy-based DNS resolution
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoHController } from './doh.controller';
import { DoHService } from './doh.service';
import { DoHAuthGuard } from './doh-auth.guard';
import { Location } from '../locations/entities/location.entity';
import { LocationsModule } from '../locations/locations.module';
import { PoliciesModule } from '../policies/policies.module';
import { ThreatDetectionModule } from '../threat-detection/threat-detection.module';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Location]),
    LocationsModule,
    PoliciesModule,
    ThreatDetectionModule,
    ClickHouseModule,
  ],
  controllers: [DoHController],
  providers: [DoHService, DoHAuthGuard],
  exports: [DoHService],
})
export class DoHModule {}

