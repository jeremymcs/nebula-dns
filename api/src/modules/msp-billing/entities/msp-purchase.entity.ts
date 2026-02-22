// Nebula DNS - MSP Purchase Entity
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
import { QueryBundle } from './query-bundle.entity';

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * MspPurchase - Record of bundle purchases by MSPs
 * Note: partnerId now references an MSP-tier tenant (tenants.tier='msp')
 */
@Entity('msp_purchases')
@Index(['partnerId'])
@Index(['createdAt'])
export class MspPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Now references an MSP-tier tenant instead of the legacy Partner table
  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'partner_id' })
  mspTenant: Tenant;

  @Column({ name: 'bundle_id', type: 'uuid', nullable: true })
  bundleId: string | null;

  @ManyToOne(() => QueryBundle, { nullable: true })
  @JoinColumn({ name: 'bundle_id' })
  bundle: QueryBundle | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PurchaseStatus;

  // Number of queries purchased
  @Column({ name: 'query_count', type: 'bigint' })
  queryCount: number;

  // Amount charged
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  // Stripe payment intent ID
  @Column({
    name: 'stripe_payment_intent_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripePaymentIntentId: string | null;

  // Stripe invoice ID
  @Column({
    name: 'stripe_invoice_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripeInvoiceId: string | null;

  // Expiration date (when these queries expire)
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // Description
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  // Is this an auto-purchase?
  @Column({ name: 'is_auto_purchase', type: 'boolean', default: false })
  isAutoPurchase: boolean;

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
