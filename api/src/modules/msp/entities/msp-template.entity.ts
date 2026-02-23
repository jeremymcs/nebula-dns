/**
 * Nebula DNS - MSP Template Entity
 * Represents policy templates owned by MSP-tier tenants
 * Updated to use the unified tier system (US-022, US-023)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { PolicyConfig } from '../../policies/entities/policy-version.entity';

export interface MspTemplateConfig extends PolicyConfig {
  // Additional template-specific fields
  policyName?: string;
  policyDescription?: string;
}

@Entity('msp_templates')
export class MspTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Now references an MSP-tier tenant instead of the legacy Partner table
  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  config: MspTemplateConfig;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', array: true, default: () => "'{}'" })
  tags: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations - now references an MSP-tier tenant
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'partner_id' })
  mspTenant: Tenant;

  @OneToMany(() => MspTemplateDeployment, (deployment) => deployment.template)
  deployments: MspTemplateDeployment[];
}

export type DeploymentMode = 'new_tenant' | 'overlay';
export type DeploymentStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed';

@Entity('msp_template_deployments')
export class MspTemplateDeployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'deployed_by', type: 'uuid', nullable: true })
  deployedBy: string;

  @Column({ name: 'template_version', type: 'int' })
  templateVersion: number;

  @Column({
    name: 'deployment_mode',
    type: 'varchar',
    length: 20,
    default: 'overlay',
  })
  deploymentMode: DeploymentMode;

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status: DeploymentStatus;

  @Column({ name: 'policies_created', type: 'int', default: 0 })
  policiesCreated: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => MspTemplate, (template) => template.deployments)
  @JoinColumn({ name: 'template_id' })
  template: MspTemplate;
}
