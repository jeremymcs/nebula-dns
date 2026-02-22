/**
 * Nebula DNS - Client Template Application Entity
 * Tracks which template version each client is using (US-036)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { MspTemplate } from './msp-template.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export type ApplicationStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed';

@Entity('client_template_applications')
@Unique(['clientTenantId', 'templateId'])
@Index(['templateId'])
@Index(['clientTenantId'])
export class ClientTemplateApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ name: 'client_tenant_id', type: 'uuid' })
  clientTenantId: string;

  @Column({ name: 'applied_version', type: 'int' })
  appliedVersion: number;

  @Column({ name: 'applied_by', type: 'uuid', nullable: true })
  appliedBy: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'completed',
  })
  status: ApplicationStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => MspTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: MspTemplate;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_tenant_id' })
  clientTenant: Tenant;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'applied_by' })
  applier: User;
}
