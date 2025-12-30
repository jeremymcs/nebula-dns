import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { PolicyVersion } from './policy-version.entity';

@Entity('policies')
export class Policy extends TenantScopedEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'current_version', type: 'int', default: 1 })
  currentVersion: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  // Visual flow representation for the policy builder UI
  @Column({ name: 'visual_flow', type: 'jsonb', nullable: true })
  visualFlow: {
    nodes: any[];
    connections: any[];
    templateName?: string;
  } | null;

  @ManyToOne(() => Tenant, (tenant) => tenant.policies)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => PolicyVersion, (version) => version.policy)
  versions: PolicyVersion[];
}
