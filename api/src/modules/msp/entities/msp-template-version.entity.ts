/**
 * Nebula DNS - MSP Template Version Entity
 * Tracks version history for MSP policy templates (US-034)
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
import { MspTemplate, MspTemplateConfig } from './msp-template.entity';
import { User } from '../../users/entities/user.entity';

@Entity('msp_template_versions')
@Index(['templateId', 'version'], { unique: true })
export class MspTemplateVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb' })
  config: MspTemplateConfig;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'text', nullable: true })
  changelog: string;

  @Column({ name: 'is_rollback', type: 'boolean', default: false })
  isRollback: boolean;

  @Column({ name: 'rollback_from_version', type: 'int', nullable: true })
  rollbackFromVersion: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => MspTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: MspTemplate;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
