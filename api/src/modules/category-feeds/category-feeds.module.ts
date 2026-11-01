import { Module } from '@nestjs/common';
import { CategoryFeedsService } from './category-feeds.service';
import { CategoryFeedsController } from './category-feeds.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [CategoryFeedsController],
  providers: [CategoryFeedsService],
  exports: [CategoryFeedsService],
})
export class CategoryFeedsModule {}
