// Nebula DNS - MSP Usage Entity
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

/**
 * MspUsage - Daily aggregated usage per MSP and tenant
 * Aggregated from ClickHouse query logs for billing purposes
 * Note: partnerId now references an MSP-tier tenant (tenants.tier='msp')
 */
@Entity('msp_usage')
@Index(['partnerId', 'usageDate'])
@Index(['tenantId', 'usageDate'])
export class MspUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Now references an MSP-tier tenant instead of the legacy Partner table
  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'partner_id' })
  mspTenant: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  // Date of usage (aggregated daily)
  @Column({ name: 'usage_date', type: 'date' })
  usageDate: Date;

  // Total queries for this day
  @Column({ name: 'query_count', type: 'bigint', default: 0 })
  queryCount: number;

  // Blocked queries
  @Column({ name: 'blocked_count', type: 'bigint', default: 0 })
  blockedCount: number;

  // Allowed queries
  @Column({ name: 'allowed_count', type: 'bigint', default: 0 })
  allowedCount: number;

  // Threat blocks
  @Column({ name: 'threat_count', type: 'bigint', default: 0 })
  threatCount: number;

  // Has this been billed/deducted from quota?
  @Column({ name: 'is_billed', type: 'boolean', default: false })
  isBilled: boolean;

  // When it was billed
  @Column({ name: 'billed_at', type: 'timestamp', nullable: true })
  billedAt: Date | null;

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
