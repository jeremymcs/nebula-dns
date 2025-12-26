import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as PDFDocument from 'pdfkit';
import { Parser as Json2CsvParser } from 'json2csv';
import { ScheduledReport, ScheduleType } from './entities/scheduled-report.entity';
import { ReportHistory } from './entities/report-history.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { CreateScheduledReportDto, UpdateScheduledReportDto } from './dto/scheduled-report.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(ScheduledReport)
    private reportRepository: Repository<ScheduledReport>,
    @InjectRepository(ReportHistory)
    private historyRepository: Repository<ReportHistory>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:4001';
  }

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
          await this.sendReportEmail(recipient, report.name, content, report.format, report, reportData);
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

  private async sendReportEmail(
    to: string,
    reportName: string,
    content: string,
    format: string,
    report: ScheduledReport,
    data: any,
  ): Promise<void> {
    this.logger.log(`Sending report "${reportName}" to ${to} as ${format}`);

    // Get tenant name
    const tenant = await this.tenantRepository.findOne({ where: { id: report.tenantId } });
    const tenantName = tenant?.name || 'SafeDNS';

    // Calculate report period
    const startDate = new Date(data.period.start);
    const endDate = new Date(data.period.end);
    const reportPeriod = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

    // Generate attachment based on format
    let attachmentBuffer: Buffer | undefined;
    let attachmentFilename: string | undefined;
    let attachmentContentType: string | undefined;

    const sanitizedName = reportName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      attachmentBuffer = await this.generatePdf(report, data);
      attachmentFilename = `${sanitizedName}_${dateStr}.pdf`;
      attachmentContentType = 'application/pdf';
    } else if (format === 'csv') {
      attachmentBuffer = this.generateCsv(report, data);
      attachmentFilename = `${sanitizedName}_${dateStr}.csv`;
      attachmentContentType = 'text/csv';
    }

    // Use the email service to send scheduled report
    await this.emailService.sendScheduledReportEmail({
      to,
      reportName,
      tenantName,
      reportPeriod,
      summary: {
        totalQueries: data.summary.totalQueries,
        blockedQueries: data.summary.blockedQueries,
        threatBlocks: data.topBlocked.filter((d: any) =>
          ['malware', 'phishing', 'c2'].includes(d.category)
        ).reduce((sum: number, d: any) => sum + d.count, 0),
        topBlockedDomains: data.topBlocked.slice(0, 5).map((d: any) => d.domain),
      },
      reportUrl: `${this.frontendUrl}/dashboard/reports`,
      attachmentBuffer,
      attachmentFilename,
      attachmentContentType,
    });
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

  async generatePdf(report: ScheduledReport, data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header with gradient-like effect
        doc.rect(0, 0, doc.page.width, 100).fill('#667eea');
        doc.fontSize(24).fillColor('#ffffff').text(report.name, 50, 35);
        doc.fontSize(12).text(
          `Report Period: ${new Date(data.period.start).toLocaleDateString()} - ${new Date(data.period.end).toLocaleDateString()}`,
          50, 65
        );

        // Summary Section
        doc.moveDown(3);
        doc.fillColor('#1f2937').fontSize(16).text('Summary', 50, 130);
        doc.moveTo(50, 150).lineTo(550, 150).stroke('#e5e7eb');

        const summaryY = 170;
        const colWidth = 125;
        doc.fontSize(10).fillColor('#6b7280');

        // Summary boxes
        const summaryItems = [
          { label: 'Total Queries', value: data.summary.totalQueries.toLocaleString() },
          { label: 'Blocked', value: data.summary.blockedQueries.toLocaleString() },
          { label: 'Allowed', value: data.summary.allowedQueries.toLocaleString() },
          { label: 'Block Rate', value: `${data.summary.blockRate}%` },
        ];

        summaryItems.forEach((item, i) => {
          const x = 50 + (i * colWidth);
          doc.rect(x, summaryY, colWidth - 10, 60).fill('#f9fafb').stroke('#e5e7eb');
          doc.fillColor('#1f2937').fontSize(18).text(item.value, x + 10, summaryY + 15, { width: colWidth - 20, align: 'center' });
          doc.fillColor('#6b7280').fontSize(9).text(item.label, x + 10, summaryY + 40, { width: colWidth - 20, align: 'center' });
        });

        // Top Blocked Domains Section
        doc.fillColor('#1f2937').fontSize(16).text('Top Blocked Domains', 50, 260);
        doc.moveTo(50, 280).lineTo(550, 280).stroke('#e5e7eb');

        let tableY = 295;
        // Table header
        doc.fillColor('#6b7280').fontSize(10);
        doc.text('Domain', 50, tableY);
        doc.text('Category', 300, tableY);
        doc.text('Count', 450, tableY);

        tableY += 20;
        data.topBlocked.slice(0, 10).forEach((item: any) => {
          doc.fillColor('#1f2937');
          doc.text(item.domain, 50, tableY, { width: 240 });
          doc.text(item.category, 300, tableY, { width: 140 });
          doc.text(item.count.toLocaleString(), 450, tableY);
          tableY += 18;
        });

        // Category Breakdown Section
        tableY += 20;
        doc.fillColor('#1f2937').fontSize(16).text('Blocks by Category', 50, tableY);
        doc.moveTo(50, tableY + 20).lineTo(550, tableY + 20).stroke('#e5e7eb');

        tableY += 35;
        doc.fillColor('#6b7280').fontSize(10);
        doc.text('Category', 50, tableY);
        doc.text('Count', 300, tableY);
        doc.text('Percentage', 450, tableY);

        tableY += 20;
        data.categoryBreakdown.slice(0, 10).forEach((item: any) => {
          doc.fillColor('#1f2937');
          doc.text(item.category, 50, tableY);
          doc.text(item.count.toLocaleString(), 300, tableY);
          doc.text(`${item.percentage}%`, 450, tableY);
          tableY += 18;
        });

        // Footer
        doc.fillColor('#9ca3af').fontSize(8);
        doc.text(
          `Generated by SafeDNS on ${new Date().toLocaleString()}`,
          50, doc.page.height - 50,
          { align: 'center', width: doc.page.width - 100 }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateCsv(report: ScheduledReport, data: any): Buffer {
    // Determine which data to export based on report type
    let csvData: any[];
    let fields: string[];

    switch (report.reportType) {
      case 'threats':
      case 'top_blocked':
        csvData = data.topBlocked.map((item: any) => ({
          domain: item.domain,
          category: item.category,
          count: item.count,
        }));
        fields = ['domain', 'category', 'count'];
        break;

      case 'activity':
        csvData = data.categoryBreakdown.map((item: any) => ({
          category: item.category,
          count: item.count,
          percentage: item.percentage,
        }));
        fields = ['category', 'count', 'percentage'];
        break;

      case 'summary':
      case 'compliance':
      default:
        // Flatten summary data for CSV
        csvData = [
          { metric: 'Total Queries', value: data.summary.totalQueries },
          { metric: 'Blocked Queries', value: data.summary.blockedQueries },
          { metric: 'Allowed Queries', value: data.summary.allowedQueries },
          { metric: 'Block Rate', value: `${data.summary.blockRate}%` },
          { metric: 'Report Period Start', value: data.period.start },
          { metric: 'Report Period End', value: data.period.end },
        ];

        // Add top blocked domains
        data.topBlocked.forEach((item: any, index: number) => {
          csvData.push({ metric: `Top Blocked #${index + 1}`, value: `${item.domain} (${item.count})` });
        });

        fields = ['metric', 'value'];
        break;
    }

    try {
      const parser = new Json2CsvParser({ fields });
      const csv = parser.parse(csvData);
      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      this.logger.error('Failed to generate CSV:', error);
      throw error;
    }
  }
}
