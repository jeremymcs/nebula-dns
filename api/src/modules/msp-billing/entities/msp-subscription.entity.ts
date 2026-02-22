// Nebula DNS - MSP Subscription Entity
// Updated to use the unified tier system (US-022, US-023)
// partnerId now references an MSP-tier tenant instead of the legacy Partner table
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type MspSubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'suspended';

/**
 * MspSubscription - MSP-level subscription with query quotas
 * Tracks the MSP's current balance and usage
 * Note: partnerId now references an MSP-tier tenant (tenants.tier='msp')
 */
@Entity('msp_subscriptions')
@Index(['partnerId'])
export class MspSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Now references an MSP-tier tenant instead of the legacy Partner table
  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'partner_id' })
  mspTenant: Tenant;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: MspSubscriptionStatus;

  // Current query balance (purchased - used)
  @Column({ name: 'query_balance', type: 'bigint', default: 0 })
  queryBalance: number;

  // Total queries purchased all-time
  @Column({ name: 'total_purchased', type: 'bigint', default: 0 })
  totalPurchased: number;

  // Total queries used all-time
  @Column({ name: 'total_used', type: 'bigint', default: 0 })
  totalUsed: number;

  // Overage rate per 1000 queries (when balance is exhausted)
  @Column({
    name: 'overage_rate',
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: 0.5,
  })
  overageRate: number;

  // Current overage count (billed at end of period)
  @Column({ name: 'current_overage', type: 'bigint', default: 0 })
  currentOverage: number;

  // Auto-purchase threshold (auto-buy bundle when balance falls below)
  @Column({ name: 'auto_purchase_threshold', type: 'bigint', nullable: true })
  autoPurchaseThreshold: number | null;

  // Auto-purchase bundle ID
  @Column({ name: 'auto_purchase_bundle_id', type: 'uuid', nullable: true })
  autoPurchaseBundleId: string | null;

  // Alert threshold (notify when balance falls below)
  @Column({ name: 'alert_threshold', type: 'bigint', nullable: true })
  alertThreshold: number | null;

  // Last alert sent
  @Column({ name: 'last_alert_at', type: 'timestamp', nullable: true })
  lastAlertAt: Date | null;

  // Billing period start
  @Column({ name: 'billing_period_start', type: 'timestamp', nullable: true })
  billingPeriodStart: Date | null;

  // Billing period end
  @Column({ name: 'billing_period_end', type: 'timestamp', nullable: true })
  billingPeriodEnd: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
