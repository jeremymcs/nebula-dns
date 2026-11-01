import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { PolicyCompilerService } from './policy-compiler.service';
import { PolicyRedisSyncService } from './policy-redis-sync.service';
import { Policy } from './entities/policy.entity';
import { PolicyVersion } from './entities/policy-version.entity';
import { Location } from '../locations/entities/location.entity';
import { LocationToken } from '../locations/entities/location-token.entity';
import { CustomList } from '../lists/entities/custom-list.entity';
import { CustomListEntry } from '../lists/entities/custom-list-entry.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    TypeOrmModule.forFeature([
      Policy,
      PolicyVersion,
      Location,
      LocationToken,
      CustomList,
      CustomListEntry,
    ]),
  ],
  controllers: [PoliciesController],
  providers: [PoliciesService, PolicyCompilerService, PolicyRedisSyncService],
  exports: [PoliciesService, PolicyCompilerService],
})
export class PoliciesModule {}
