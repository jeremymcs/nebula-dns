// Nebula DNS - Tenant Entity
// Defines the Tenant model for multi-tenancy support with tier-based features
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Entity, Column, OneToMany, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Policy } from '../../policies/entities/policy.entity';
import { Location } from '../../locations/entities/location.entity';

export type TenantStatus = 'active' | 'suspended' | 'cancelled';
export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';

// Tier system for unified user tiers
export type TenantTier = 'home' | 'enterprise' | 'msp';
export type SubscriptionStatus = 'active' | 'grace' | 'suspended';

export interface TenantSettings {
  timezone?: string;
  blockPageEnabled?: boolean;
  contactEmail?: string;
  notifications?: {
    threatAlerts?: boolean;
    weeklyReports?: boolean;
    systemUpdates?: boolean;
  };
  // MSP-specific settings
  mspDisplayName?: string;
  mspSupportUrl?: string;
  mspSupportEmail?: string;
  /** Flux Shield product module toggles (admin-managed overrides) */
  productModules?: {
    dnsFilter?: boolean;
    dnsManagement?: boolean;
    dmarc?: boolean;
  };
}

// Tenant represents an Organization (sub-client) in the MSP hierarchy
// MSP tenants can manage client tenants via managed_by_msp_id relationship
@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: TenantStatus;

  @Column({ type: 'varchar', length: 20, default: 'free' })
  plan: TenantPlan;

  // Tier system for unified user tiers (US-001)
  @Column({
    type: 'enum',
    enum: ['home', 'enterprise', 'msp'],
    default: 'home',
  })
  tier: TenantTier;

  // Location limit (null = unlimited)
  @Column({ name: 'location_limit', type: 'int', nullable: true })
  locationLimit: number | null;

  // Client limit for MSP tier (null = unlimited)
  @Column({ name: 'client_limit', type: 'int', nullable: true })
  clientLimit: number | null;

  // Subscription status for billing/access control
  @Column({
    name: 'subscription_status',
    type: 'enum',
    enum: ['active', 'grace', 'suspended'],
    default: 'active',
  })
  subscriptionStatus: SubscriptionStatus;

  // Self-referential FK for MSP-managed clients
  @Column({ name: 'managed_by_msp_id', type: 'uuid', nullable: true })
  managedByMspId: string | null;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'managed_by_msp_id' })
  managedByMsp: Tenant | null;

  // Clients managed by this MSP tenant (inverse relationship)
  @OneToMany(() => Tenant, (tenant) => tenant.managedByMsp)
  managedClients: Tenant[];

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
