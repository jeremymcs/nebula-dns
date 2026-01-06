import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'paused';
export type BillingCycle = 'monthly' | 'yearly';

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'plan_id', type: 'varchar', length: 50 })
  planId: string;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: SubscriptionStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'monthly',
    name: 'billing_cycle',
  })
  billingCycle: BillingCycle;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'stripe_customer_id',
  })
  stripeCustomerId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'stripe_subscription_id',
  })
  stripeSubscriptionId: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'current_period_start' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'trial_end' })
  trialEnd: Date | null;

  @Column({ type: 'boolean', default: false, name: 'cancel_at_period_end' })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'canceled_at' })
  canceledAt: Date | null;
}
