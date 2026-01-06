import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Policy } from '../../policies/entities/policy.entity';
import { Location } from '../../locations/entities/location.entity';
import { Partner } from '../../partners/entities/partner.entity';

export type TenantStatus = 'active' | 'suspended' | 'cancelled';
export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface TenantSettings {
  timezone?: string;
  blockPageEnabled?: boolean;
  contactEmail?: string;
  notifications?: {
    threatAlerts?: boolean;
    weeklyReports?: boolean;
    systemUpdates?: boolean;
  };
}

// Tenant represents an Organization (sub-client) in the MSP hierarchy
// Each Tenant belongs to a Partner (MSP/Reseller)
@Entity('tenants')
export class Tenant extends BaseEntity {
  // Partner (MSP) that manages this organization
  @Column({ name: 'partner_id', type: 'uuid', nullable: true })
  partnerId: string | null;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: TenantStatus;

  @Column({ type: 'varchar', length: 20, default: 'free' })
  plan: TenantPlan;

  @Column({ type: 'jsonb', nullable: true })
  settings: TenantSettings;

  // Contact information
  @Column({
    name: 'contact_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  contactEmail: string | null;

  @Column({
    name: 'contact_phone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  contactPhone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string | null;

  @Column({ name: 'company_size', type: 'varchar', length: 50, nullable: true })
  companySize: string | null;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Policy, (policy) => policy.tenant)
  policies: Policy[];

  @OneToMany(() => Location, (location) => location.tenant)
  locations: Location[];
}
