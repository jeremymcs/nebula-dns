/**
 * Nebula DNS - Template Apply Job Entity
 * Tracks async template application operations (US-036)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { MspTemplate } from './msp-template.entity';
import { User } from '../../users/entities/user.entity';

export type ApplyJobStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ApplyJobResult {
  clientId: string;
  clientName: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  policyId?: string;
}

@Entity('template_apply_jobs')
@Index(['templateId'])
@Index(['status'])
@Index(['createdAt'])
export class TemplateApplyJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ name: 'template_version', type: 'int' })
  templateVersion: number;

  @Column({ name: 'initiated_by', type: 'uuid', nullable: true })
  initiatedBy: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: ApplyJobStatus;

  @Column({ name: 'total_clients', type: 'int', default: 0 })
  totalClients: number;

  @Column({ name: 'processed_clients', type: 'int', default: 0 })
  processedClients: number;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'client_ids', type: 'jsonb', default: [] })
  clientIds: string[];

  @Column({ type: 'jsonb', default: [] })
  results: ApplyJobResult[];

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => MspTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: MspTemplate;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'initiated_by' })
  initiator: User;
}
