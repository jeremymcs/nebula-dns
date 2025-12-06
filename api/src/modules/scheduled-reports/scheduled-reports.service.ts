import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledReport, ScheduleType } from './entities/scheduled-report.entity';
import { ReportHistory } from './entities/report-history.entity';
import { CreateScheduledReportDto, UpdateScheduledReportDto } from './dto/scheduled-report.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    @InjectRepository(ScheduledReport)
    private reportRepository: Repository<ScheduledReport>,
    @InjectRepository(ReportHistory)
    private historyRepository: Repository<ReportHistory>,
    private emailService: EmailService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateScheduledReportDto): Promise<ScheduledReport> {
    const report = this.reportRepository.create({
      tenantId,
      createdById: userId,
      ...dto,
      nextRunAt: this.calculateNextRun(dto.scheduleType, dto.scheduleDay, dto.scheduleTime || '08:00', dto.timezone || 'UTC'),
    });

    return this.reportRepository.save(report);
  }

  async findAll(tenantId: string): Promise<ScheduledReport[]> {
    return this.reportRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ScheduledReport> {
    const report = await this.reportRepository.findOne({
      where: { id, tenantId },
    });

    if (!report) {
      throw new NotFoundException('Scheduled report not found');
    }

    return report;
  }

  async update(tenantId: string, id: string, dto: UpdateScheduledReportDto): Promise<ScheduledReport> {
    const report = await this.findOne(tenantId, id);

    Object.assign(report, dto);

    // Recalculate next run if schedule changed
    if (dto.scheduleType || dto.scheduleDay || dto.scheduleTime || dto.timezone) {
      report.nextRunAt = this.calculateNextRun(
        report.scheduleType,
        report.scheduleDay,
        report.scheduleTime,
        report.timezone,
      );
    }

    return this.reportRepository.save(report);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const report = await this.findOne(tenantId, id);
    await this.reportRepository.remove(report);
  }

  async getHistory(tenantId: string, reportId: string): Promise<ReportHistory[]> {
    return this.historyRepository.find({
      where: { scheduledReportId: reportId, tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async runReportNow(tenantId: string, id: string): Promise<ReportHistory> {
    const report = await this.findOne(tenantId, id);
    return this.generateAndSendReport(report);
  }

  // Run every minute to check for scheduled reports
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledReports(): Promise<void> {
    const now = new Date();
    
    const dueReports = await this.reportRepository.find({
      where: {
        isEnabled: true,
        nextRunAt: LessThanOrEqual(now),
      },
    });

    for (const report of dueReports) {
      try {
        await this.generateAndSendReport(report);
        
        // Update next run time
        report.lastSentAt = now;
        report.nextRunAt = this.calculateNextRun(
          report.scheduleType,
          report.scheduleDay,
          report.scheduleTime,
          report.timezone,
        );
        await this.reportRepository.save(report);
      } catch (error) {
        this.logger.error(`Failed to process report ${report.id}:`, error);
      }
    }
  }

  private async generateAndSendReport(report: ScheduledReport): Promise<ReportHistory> {
    const history = this.historyRepository.create({
      scheduledReportId: report.id,
      tenantId: report.tenantId,
      status: 'generating',
      startedAt: new Date(),
    });
    await this.historyRepository.save(history);

    try {
      // Generate report data based on type
      const reportData = await this.generateReportData(report);
      
      // Generate report content
      const content = this.formatReport(report, reportData);
      
      // Send to all recipients
      const sentRecipients: string[] = [];
      for (const recipient of report.recipients) {
        try {
          await this.sendReportEmail(recipient, report.name, content, report.format);
          sentRecipients.push(recipient);
        } catch (error) {
          this.logger.error(`Failed to send report to ${recipient}:`, error);
        }
      }

      history.status = 'sent';
      history.recipientsSent = sentRecipients;
      history.completedAt = new Date();
      
    } catch (error) {
      history.status = 'failed';
      history.errorMessage = error.message;
      history.completedAt = new Date();
    }

    return this.historyRepository.save(history);
  }

  private async generateReportData(report: ScheduledReport): Promise<any> {
    // This would query ClickHouse for actual data
    // For now, return sample data structure
    const now = new Date();
    const startDate = this.getStartDate(report.filters?.dateRangeType || 'last_week');

    const sampleData = {
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      summary: {
        totalQueries: 1542890,
        blockedQueries: 44656,
        allowedQueries: 1498234,
        blockRate: 2.89,
      },
      topBlocked: [
        { domain: 'malware-site.com', count: 1542, category: 'malware' },
        { domain: 'phishing-page.net', count: 892, category: 'phishing' },
        { domain: 'adtracker.com', count: 756, category: 'advertising' },
      ],
      categoryBreakdown: [
        { category: 'Malware', count: 12456, percentage: 27.9 },
        { category: 'Phishing', count: 8923, percentage: 20.0 },
        { category: 'Adult Content', count: 7234, percentage: 16.2 },
      ],
      threatTrend: [
        { date: '2024-01-15', malware: 823, phishing: 612 },
        { date: '2024-01-16', malware: 756, phishing: 589 },
        { date: '2024-01-17', malware: 891, phishing: 634 },
      ],
    };

    return sampleData;
  }

  private formatReport(report: ScheduledReport, data: any): string {
    // Generate HTML report content
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${report.name}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .summary-card { background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; }
    .summary-value { font-size: 24px; font-weight: bold; color: #1f2937; }
    .summary-label { font-size: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .section { margin: 30px 0; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">${report.name}</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">Report Period: ${new Date(data.period.start).toLocaleDateString()} - ${new Date(data.period.end).toLocaleDateString()}</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-value">${data.summary.totalQueries.toLocaleString()}</div>
      <div class="summary-label">Total Queries</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${data.summary.blockedQueries.toLocaleString()}</div>
      <div class="summary-label">Blocked</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${data.summary.allowedQueries.toLocaleString()}</div>
      <div class="summary-label">Allowed</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${data.summary.blockRate}%</div>
      <div class="summary-label">Block Rate</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Top Blocked Domains</h2>
    <table>
      <tr>
        <th>Domain</th>
        <th>Category</th>
        <th>Count</th>
      </tr>
      ${data.topBlocked.map((item: any) => `
      <tr>
        <td>${item.domain}</td>
        <td>${item.category}</td>
        <td>${item.count.toLocaleString()}</td>
      </tr>
      `).join('')}
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Blocks by Category</h2>
    <table>
      <tr>
        <th>Category</th>
        <th>Count</th>
        <th>Percentage</th>
      </tr>
      ${data.categoryBreakdown.map((item: any) => `
      <tr>
        <td>${item.category}</td>
        <td>${item.count.toLocaleString()}</td>
        <td>${item.percentage}%</td>
      </tr>
      `).join('')}
    </table>
  </div>

  <p style="color: #6b7280; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    This report was automatically generated by SafeDNS on ${new Date().toLocaleString()}.
  </p>
</body>
</html>`;
  }

  private async sendReportEmail(to: string, reportName: string, content: string, format: string): Promise<void> {
    // Use the email service to send
    // In production, would attach PDF/CSV file
    this.logger.log(`Sending report "${reportName}" to ${to} as ${format}`);
    
    // For now, send as HTML email
    // In production, convert to PDF/CSV and attach
  }

  private calculateNextRun(
    scheduleType: ScheduleType,
    scheduleDay: number | undefined,
    scheduleTime: string,
    timezone: string,
  ): Date {
    const now = new Date();
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    // If time has passed today, move to next occurrence
    if (nextRun <= now) {
      switch (scheduleType) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }
    }

    // Adjust for specific day
    if (scheduleType === 'weekly' && scheduleDay !== undefined) {
      const currentDay = nextRun.getDay();
      const daysUntilTarget = (scheduleDay - currentDay + 7) % 7;
      if (daysUntilTarget > 0 || nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7));
      }
    } else if (scheduleType === 'monthly' && scheduleDay !== undefined) {
      nextRun.setDate(Math.min(scheduleDay, 28)); // Avoid invalid dates
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }

    return nextRun;
  }

  private getStartDate(rangeType: string): Date {
    const now = new Date();
    switch (rangeType) {
      case 'last_day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'last_week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last_month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }
}
