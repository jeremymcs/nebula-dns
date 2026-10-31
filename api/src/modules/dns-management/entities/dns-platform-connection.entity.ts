// Nebula DNS - DNS Platform Connection Entity
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net

import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { DnsPlatformConnectionStatus } from '../enums/dns-connection-status.enum';

export interface DnsZoneInventoryEntry {
  providerZoneId: string;
  zoneName: string;
  status: string;
  nameServers: string[];
  syncedAt: string;
}

@Entity('dns_platform_connections')
export class DnsPlatformConnection extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'varchar', length: 50, default: 'cloudflare' })
  provider: string;

  @Column({ type: 'varchar', length: 50, default: 'primary' })
  purpose: string;

  @Column({ name: 'token_ciphertext', type: 'text' })
  tokenCiphertext: string;

  @Column({ name: 'token_key_id', type: 'varchar', length: 50, default: 'primary' })
  tokenKeyId: string;

  @Column({ name: 'token_fingerprint', type: 'varchar', length: 64 })
  tokenFingerprint: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DnsPlatformConnectionStatus.PENDING,
  })
  status: DnsPlatformConnectionStatus;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'last_rotated_at', type: 'timestamptz', nullable: true })
  lastRotatedAt: Date | null;

  @Column({ name: 'created_by_admin_id', type: 'uuid', nullable: true })
  createdByAdminId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    accountId?: string;
    scopes?: string[];
    zoneInventory?: DnsZoneInventoryEntry[];
    inventorySyncedAt?: string;
  };
}
