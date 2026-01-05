import { Module, forwardRef } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { UsersModule } from '../users/users.module';
import { PoliciesModule } from '../policies/policies.module';
import { LocationsModule } from '../locations/locations.module';
import { ThreatFeedsModule } from '../threat-feeds/threat-feeds.module';
import { ThreatDetectionModule } from '../threat-detection/threat-detection.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => PoliciesModule),
    forwardRef(() => LocationsModule),
    forwardRef(() => ThreatFeedsModule),
    forwardRef(() => ThreatDetectionModule),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
