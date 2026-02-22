// Nebula DNS - Trial History Entity
// Tracks trial history for tier upgrade trials (US-032, US-033)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant, TenantTier } from '../../tenants/entities/tenant.entity';

export type TrialStatus = 'active' | 'converted' | 'expired' | 'cancelled';

@Entity('trial_history')
@Index(['tenantId', 'trialTier'], { unique: true })
export class TrialHistory extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // The tier that was being trialed
  @Column({
    name: 'trial_tier',
    type: 'enum',
    enum: ['home', 'enterprise', 'msp'],
  })
  trialTier: TenantTier;

  // The original tier before the trial started
  @Column({
    name: 'original_tier',
    type: 'enum',
    enum: ['home', 'enterprise', 'msp'],
  })
  originalTier: TenantTier;

  // Trial period
  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  // Trial outcome
  @Column({
    type: 'enum',
    enum: ['active', 'converted', 'expired', 'cancelled'],
    default: 'active',
  })
  status: TrialStatus;

  // When the trial ended (conversion, expiration, or cancellation)
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  // When converted to paid (if applicable)
  @Column({ name: 'converted_at', type: 'timestamptz', nullable: true })
  convertedAt: Date | null;

  // Stripe subscription ID created for the trial
  @Column({
    name: 'stripe_subscription_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  stripeSubscriptionId: string | null;

  // Was the 3-day warning email sent?
  @Column({ name: 'warning_email_sent', type: 'boolean', default: false })
  warningEmailSent: boolean;

  // Metadata for additional trial information
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    billingCycle?: 'monthly' | 'yearly';
    convertedByUserId?: string;
    cancellationReason?: string;
  } | null;
}
