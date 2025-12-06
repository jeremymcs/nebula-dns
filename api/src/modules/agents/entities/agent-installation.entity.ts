import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Location } from '../../locations/entities/location.entity';

export type AgentPlatform = 'windows' | 'macos' | 'linux' | 'ios' | 'android';
export type AgentStatus = 'active' | 'inactive' | 'disconnected' | 'error';

@Entity('agent_installations')
export class AgentInstallation extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'location_id', nullable: true })
  locationId: string;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ name: 'device_id', length: 255 })
  deviceId: string;

  @Column({ name: 'device_name', length: 255, nullable: true })
  deviceName: string;

  @Column({ type: 'varchar', length: 20 })
  platform: AgentPlatform;

  @Column({ name: 'os_version', length: 50, nullable: true })
  osVersion: string;

  @Column({ name: 'agent_version', length: 20 })
  agentVersion: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: AgentStatus;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', default: {} })
  settings: {
    dnsOverHttps?: boolean;
    blockPage?: boolean;
    logQueries?: boolean;
  };
}
