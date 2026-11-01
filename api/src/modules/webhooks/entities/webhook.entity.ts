// Nebula DNS - Webhook Entity with Secret Rotation Support
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type WebhookEvent =
  | 'policy.created'
  | 'policy.updated'
  | 'policy.deleted'
  | 'location.created'
  | 'location.updated'
  | 'location.deleted'
  | 'user.created'
  | 'user.invited'
  | 'user.deleted'
  | 'threat.detected'
  | 'report.generated'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled';

@Entity('webhooks')
export class Webhook extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'secret_hash', type: 'varchar', length: 255, nullable: true })
  secretHash: string | null;

  @Column({ type: 'jsonb', default: [] })
  events: WebhookEvent[];

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  headers: Record<string, string>;

  @Column({ name: 'last_triggered_at', type: 'timestamptz', nullable: true })
  lastTriggeredAt: Date | null;

  @Column({ name: 'last_status_code', type: 'int', nullable: true })
  lastStatusCode: number | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'failure_count', type: 'int', default: 0 })
  failureCount: number;

  @Column({
    name: 'ip_allowlist',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  ipAllowlist: string[];

  @Column({ name: 'rate_limit', type: 'int', default: 60 })
  rateLimit: number;

  // Secret rotation fields
  @Column({
    name: 'previous_secret',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  previousSecret: string | null;

  @Column({ name: 'secret_rotated_at', type: 'timestamptz', nullable: true })
  secretRotatedAt: Date | null;

  @Column({
    name: 'secret_grace_period_ends',
    type: 'timestamptz',
    nullable: true,
  })
  secretGracePeriodEnds: Date | null;
}
