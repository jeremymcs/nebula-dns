import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ScheduledReport } from './scheduled-report.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type ReportHistoryStatus = 'pending' | 'generating' | 'sent' | 'failed';

@Entity('report_history')
export class ReportHistory extends BaseEntity {
  @Column({ name: 'scheduled_report_id', type: 'uuid' })
  scheduledReportId: string;

  @ManyToOne(() => ScheduledReport)
  @JoinColumn({ name: 'scheduled_report_id' })
  scheduledReport: ScheduledReport;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ReportHistoryStatus;

  @Column({ name: 'recipients_sent', type: 'jsonb', default: [] })
  recipientsSent: string[];

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string;

  @Column({ name: 'file_size_bytes', type: 'int', nullable: true })
  fileSizeBytes: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;
}
