import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Partner } from '../../partners/entities/partner.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * MspUsage - Daily aggregated usage per MSP and tenant
 * Aggregated from ClickHouse query logs for billing purposes
 */
@Entity('msp_usage')
@Index(['partnerId', 'usageDate'])
@Index(['tenantId', 'usageDate'])
export class MspUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId: string;

  @ManyToOne(() => Partner)
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

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
