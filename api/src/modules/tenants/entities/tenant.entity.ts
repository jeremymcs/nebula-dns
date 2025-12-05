import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Policy } from '../../policies/entities/policy.entity';
import { Location } from '../../locations/entities/location.entity';

export type TenantStatus = 'active' | 'suspended' | 'cancelled';
export type TenantPlan = 'free' | 'pro' | 'enterprise';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: TenantStatus;

  @Column({ type: 'varchar', length: 20, default: 'free' })
  plan: TenantPlan;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Policy, (policy) => policy.tenant)
  policies: Policy[];

  @OneToMany(() => Location, (location) => location.tenant)
  locations: Location[];
}
