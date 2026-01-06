import { Module } from '@nestjs/common';
import { ThreatDetectionService } from './threat-detection.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  providers: [ThreatDetectionService],
  exports: [ThreatDetectionService],
})
export class ThreatDetectionModule {}
