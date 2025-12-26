import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantScopedEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { LocationToken } from './location-token.entity';

export type LocationStatus = 'active' | 'inactive';

@Entity('locations')
export class Location extends TenantScopedEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: LocationStatus;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId: string;

  @Column({ name: 'ip_range', type: 'inet', nullable: true })
  ipRange: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dyndns: string;

  @Column({ name: 'rate_limit', type: 'int', default: 1000 })
  rateLimit: number;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @ManyToOne(() => Tenant, (tenant) => tenant.locations)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => LocationToken, (token) => token.location)
  tokens: LocationToken[];
}
