// Nebula DNS - MSP Client Entity
// Junction table for MSP-to-Client tenant relationships (US-005)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Status of the MSP-Client relationship
 */
export type MspClientStatus = 'active' | 'suspended';

/**
 * MspClient entity represents the relationship between an MSP tenant
 * and a client tenant. This is a junction table that formalizes the
 * MSP-to-client management relationship.
 *
 * Key constraints:
 * - One client can only have one MSP (unique on clientTenantId)
 * - MSP can have multiple clients
 * - Indexed on mspTenantId for fast MSP-to-clients lookup
 */
@Entity('msp_clients')
@Unique(['clientTenantId']) // One client can only have one MSP
@Index(['mspTenantId']) // Fast lookup for all clients of an MSP
export class MspClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The MSP tenant that manages this client
   */
  @Column({ name: 'msp_tenant_id', type: 'uuid' })
  mspTenantId: string;

  /**
   * The client tenant being managed
   */
  @Column({ name: 'client_tenant_id', type: 'uuid' })
  clientTenantId: string;

  /**
   * Status of the MSP-Client relationship
   * - active: Normal operational state
   * - suspended: Temporarily suspended (e.g., for non-payment)
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: MspClientStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'msp_tenant_id' })
  mspTenant: Tenant;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_tenant_id' })
  clientTenant: Tenant;
}
