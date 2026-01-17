// Nebula DNS - GeoIP Module
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { GeoIPService } from './geoip.service';
import { GeoIPController } from './geoip.controller';

@Module({
  controllers: [GeoIPController],
  providers: [GeoIPService],
  exports: [GeoIPService],
})
export class GeoIPModule {}
