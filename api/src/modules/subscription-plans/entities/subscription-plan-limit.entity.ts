// Nebula DNS - Subscription Plan Limits Entity
// Defines tier-based subscription limits for billing integration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SubscriptionTier = 'home' | 'enterprise' | 'msp';

@Entity('subscription_plan_limits')
export class SubscriptionPlanLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'stripe_price_id',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  @Index('IDX_subscription_plan_limits_stripe_price_id')
  stripePriceId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  tier: SubscriptionTier;

  @Column({
    name: 'location_limit',
    type: 'integer',
    nullable: true,
  })
  locationLimit: number | null;

  @Column({
    name: 'client_limit',
    type: 'integer',
    nullable: true,
  })
  clientLimit: number | null;

  @Column({
    name: 'family_member_limit',
    type: 'integer',
    default: 5,
  })
  familyMemberLimit: number;

  @Column({
    name: 'price_per_location',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  pricePerLocation: number | null;

  @Column({
    name: 'price_per_client',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  pricePerClient: number | null;

  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  basePrice: number;

  @Column({
    name: 'trial_days',
    type: 'integer',
    default: 14,
  })
  trialDays: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
