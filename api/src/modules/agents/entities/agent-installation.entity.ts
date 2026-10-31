import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Location } from '../../locations/entities/location.entity';

export type AgentPlatform = 'windows' | 'macos' | 'linux' | 'ios' | 'android';
export type AgentStatus = 'active' | 'inactive' | 'disconnected' | 'error';
export type AgentRole = 'site-updater' | 'dns-enforce';

@Entity('agent_installations')
export class AgentInstallation extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ name: 'device_id', type: 'varchar', length: 255 })
  deviceId: string;

  @Column({ name: 'device_name', type: 'varchar', length: 255, nullable: true })
  deviceName: string;

  @Column({ type: 'varchar', length: 20 })
  platform: AgentPlatform;

  @Column({ name: 'os_version', type: 'varchar', length: 50, nullable: true })
  osVersion: string | null;

  @Column({ name: 'agent_version', type: 'varchar', length: 20 })
  agentVersion: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: AgentStatus;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'device_secret_hash', type: 'varchar', length: 255, nullable: true })
  deviceSecretHash: string | null;

  @Column({ type: 'jsonb', default: ['dns-enforce'] })
  roles: AgentRole[];

  @Column({ name: 'dns_enforced', type: 'boolean', default: false })
  dnsEnforced: boolean;

  @Column({ name: 'doh_token_hash', type: 'varchar', length: 255, nullable: true })
  dohTokenHash: string | null;

  @Column({ name: 'last_tamper_at', type: 'timestamptz', nullable: true })
  lastTamperAt: Date | null;

  @Column({ name: 'tamper_count', type: 'int', default: 0 })
  tamperCount: number;

  @Column({ type: 'jsonb', default: {} })
  settings: {
    dnsOverHttps?: boolean;
    blockPage?: boolean;
    logQueries?: boolean;
  };
}
