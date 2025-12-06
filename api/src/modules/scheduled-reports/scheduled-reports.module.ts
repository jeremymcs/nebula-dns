import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledReportsService } from './scheduled-reports.service';
import { ScheduledReportsController } from './scheduled-reports.controller';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { ReportHistory } from './entities/report-history.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledReport, ReportHistory]),
    EmailModule,
  ],
  controllers: [ScheduledReportsController],
  providers: [ScheduledReportsService],
  exports: [ScheduledReportsService],
})
export class ScheduledReportsModule {}
