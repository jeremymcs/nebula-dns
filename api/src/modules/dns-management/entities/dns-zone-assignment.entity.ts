// Nebula DNS - DNS Zone Assignment Entity
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { DnsProvisioningModel } from '../enums/dns-provisioning-model.enum';

@Entity('dns_zone_assignments')
export class DnsZoneAssignment extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({
    name: 'provisioning_model',
    type: 'varchar',
    length: 30,
    default: DnsProvisioningModel.PLATFORM_HOSTED,
  })
  provisioningModel: DnsProvisioningModel;

  @Column({ name: 'connection_id', type: 'uuid' })
  connectionId: string;

  @Column({ name: 'provider_zone_id', type: 'varchar', length: 64 })
  providerZoneId: string;

  @Column({ name: 'zone_name', type: 'varchar', length: 255 })
  zoneName: string;

  @Column({ type: 'varchar', length: 30, default: 'active' })
  status: string;

  @Column({ name: 'name_servers', type: 'jsonb', default: [] })
  nameServers: string[];

  @Column({ name: 'can_edit_records', type: 'boolean', default: true })
  canEditRecords: boolean;

  @Column({ name: 'can_toggle_proxy', type: 'boolean', default: true })
  canToggleProxy: boolean;

  @Column({ name: 'can_delete_records', type: 'boolean', default: true })
  canDeleteRecords: boolean;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'NOW()' })
  assignedAt: Date;

  @Column({ name: 'assigned_by_admin_id', type: 'uuid', nullable: true })
  assignedByAdminId: string | null;

  @Column({ name: 'unassigned_at', type: 'timestamptz', nullable: true })
  unassignedAt: Date | null;
}
