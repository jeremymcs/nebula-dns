import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export type ReportType = 'summary' | 'threats' | 'top_blocked' | 'activity' | 'compliance';
export type ScheduleType = 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'pdf' | 'csv' | 'html';

@Entity('scheduled_reports')
export class ScheduledReport extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'report_type', type: 'varchar', length: 50 })
  reportType: ReportType;

  @Column({ name: 'schedule_type', type: 'varchar', length: 20 })
  scheduleType: ScheduleType;

  @Column({ name: 'schedule_day', nullable: true })
  scheduleDay: number; // 0-6 for weekly, 1-31 for monthly

  @Column({ name: 'schedule_time', type: 'time', default: '08:00' })
  scheduleTime: string;

  @Column({ length: 50, default: 'UTC' })
  timezone: string;

  @Column({ type: 'jsonb', default: [] })
  recipients: string[]; // Array of email addresses

  @Column({ type: 'jsonb', default: {} })
  filters: {
    locationIds?: string[];
    categories?: string[];
    dateRangeType?: 'last_day' | 'last_week' | 'last_month';
  };

  @Column({ type: 'varchar', length: 10, default: 'pdf' })
  format: ReportFormat;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt: Date;

  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt: Date;
}
