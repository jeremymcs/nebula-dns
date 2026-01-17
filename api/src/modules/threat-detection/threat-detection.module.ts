// Nebula DNS - Threat Detection Module
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Module } from '@nestjs/common';
import { ThreatDetectionController } from './threat-detection.controller';
import { ThreatDetectionService } from './threat-detection.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [ThreatDetectionController],
  providers: [ThreatDetectionService],
  exports: [ThreatDetectionService],
})
export class ThreatDetectionModule {}
