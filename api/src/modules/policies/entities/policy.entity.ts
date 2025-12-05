import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { PolicyVersion } from './policy-version.entity';

@Entity('policies')
export class Policy extends TenantScopedEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'current_version', default: 1 })
  currentVersion: number;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @ManyToOne(() => Tenant, (tenant) => tenant.policies)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => PolicyVersion, (version) => version.policy)
  versions: PolicyVersion[];
}
