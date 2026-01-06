import { Module } from '@nestjs/common';
import { ThreatFeedsService } from './threat-feeds.service';
import { ThreatFeedsController } from './threat-feeds.controller';

@Module({
  controllers: [ThreatFeedsController],
  providers: [ThreatFeedsService],
  exports: [ThreatFeedsService],
})
export class ThreatFeedsModule {}
