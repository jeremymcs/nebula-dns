import { Entity, Column, PrimaryColumn } from 'typeorm';

export interface PlanFeatures {
  dns_filtering: boolean;
  basic_reporting?: boolean;
  advanced_reporting?: boolean;
  email_support?: boolean;
  priority_support?: boolean;
  dedicated_support?: boolean;
  custom_blocklists?: boolean;
  api_access?: boolean;
  safesearch?: boolean;
  schedules?: boolean;
  audit_logs?: boolean;
  sso?: boolean;
  custom_branding?: boolean;
  sla?: boolean;
}

export interface PlanLimits {
  locations: number; // -1 = unlimited
  queries_per_month: number;
  users: number;
  policies: number;
  custom_lists: number;
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_monthly' })
  priceMonthly: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_yearly' })
  priceYearly: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'stripe_price_monthly_id',
  })
  stripePriceMonthlyId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'stripe_price_yearly_id',
  })
  stripePriceYearlyId: string;

  @Column({ type: 'jsonb', default: {} })
  features: PlanFeatures;

  @Column({ type: 'jsonb', default: {} })
  limits: PlanLimits;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
