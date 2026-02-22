// Nebula DNS - MSP Invoice Entity
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

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed' | 'void';

/**
 * MspInvoice - Invoices for MSP billing (overages, purchases, etc.)
 * Note: partnerId now references an MSP-tier tenant (tenants.tier='msp')
 */
@Entity('msp_invoices')
@Index(['partnerId'])
@Index(['status'])
export class MspInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Now references an MSP-tier tenant instead of the legacy Partner table
  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'partner_id' })
  mspTenant: Tenant;

  @Column({ name: 'invoice_number', type: 'varchar', length: 50, unique: true })
  invoiceNumber: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: InvoiceStatus;

  // Invoice period
  @Column({ name: 'period_start', type: 'timestamp' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp' })
  periodEnd: Date;

  // Subtotal (before tax)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  // Tax amount
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  // Total amount
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  // Line items as JSON
  @Column({ name: 'line_items', type: 'jsonb', default: '[]' })
  lineItems: InvoiceLineItem[];

  // Stripe invoice ID
  @Column({
    name: 'stripe_invoice_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripeInvoiceId: string | null;

  // Stripe invoice URL
  @Column({
    name: 'stripe_invoice_url',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  stripeInvoiceUrl: string | null;

  // Due date
  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date | null;

  // Paid date
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string | null;

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

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'bundle' | 'overage' | 'credit' | 'adjustment';
}
