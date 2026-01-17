// Nebula DNS - API Key IP Allowlisting
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export type ApiKeyScope = 'read' | 'write' | 'admin';

@Entity('api_keys')
export class ApiKey extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'key_hash', type: 'varchar', length: 255, unique: true })
  keyHash: string;

  @Column({ name: 'key_prefix', type: 'varchar', length: 12 })
  keyPrefix: string;

  @Column({ type: 'jsonb', default: ['read'] })
  scopes: ApiKeyScope[];

  @Column({ name: 'rate_limit', type: 'int', default: 1000 })
  rateLimit: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'last_used_ip', type: 'inet', nullable: true })
  lastUsedIp: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  /**
   * Array of exact IP addresses allowed to use this API key.
   * If null or empty (and allowedCidrs is also empty), all IPs are allowed.
   */
  @Column({ name: 'allowed_ips', type: 'text', array: true, nullable: true })
  allowedIps: string[] | null;

  /**
   * Array of CIDR ranges allowed to use this API key.
   * If null or empty (and allowedIps is also empty), all IPs are allowed.
   */
  @Column({ name: 'allowed_cidrs', type: 'text', array: true, nullable: true })
  allowedCidrs: string[] | null;
}
