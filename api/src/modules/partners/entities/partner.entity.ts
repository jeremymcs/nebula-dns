import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { PartnerUser } from './partner-user.entity';

export type PartnerStatus = 'active' | 'suspended' | 'cancelled';
export type PartnerPlan = 'starter' | 'professional' | 'enterprise';

export interface PartnerBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  customDomain?: string;
  companyName?: string;
  supportEmail?: string;
  supportUrl?: string;
}

export interface PartnerSettings {
  timezone?: string;
  maxOrganizations?: number;
  maxLocationsPerOrg?: number;
  maxUsersPerOrg?: number;
  allowedPlans?: string[];
  features?: {
    whiteLabel?: boolean;
    customBlockPages?: boolean;
    apiAccess?: boolean;
    ssoEnabled?: boolean;
    advancedReporting?: boolean;
  };
  notifications?: {
    newOrgAlert?: boolean;
    billingAlerts?: boolean;
    securityAlerts?: boolean;
  };
}

@Entity('partners')
export class Partner extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: PartnerStatus;

  @Column({ type: 'varchar', length: 20, default: 'starter' })
  plan: PartnerPlan;

  @Column({
    name: 'contact_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  contactEmail: string;

  @Column({
    name: 'contact_phone',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  contactPhone: string;

  @Column({
    name: 'billing_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  billingEmail: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'jsonb', nullable: true })
  branding: PartnerBranding;

  @Column({ type: 'jsonb', nullable: true })
  settings: PartnerSettings;

  // Stripe customer ID for billing
  @Column({
    name: 'stripe_customer_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripeCustomerId: string;

  // Relations
  @OneToMany(() => PartnerUser, (user) => user.partner)
  users: PartnerUser[];

  // Note: organizations relation is defined in Tenant entity to avoid circular imports
}
