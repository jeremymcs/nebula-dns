import { Module } from '@nestjs/common';
import { ThreatFeedsService } from './threat-feeds.service';
import { ThreatFeedsController } from './threat-feeds.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [ThreatFeedsController],
  providers: [ThreatFeedsService],
  exports: [ThreatFeedsService],
})
export class ThreatFeedsModule {}
