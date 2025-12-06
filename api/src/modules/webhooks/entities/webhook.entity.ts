import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type WebhookEvent = 
  | 'policy.created' | 'policy.updated' | 'policy.deleted'
  | 'location.created' | 'location.updated' | 'location.deleted'
  | 'user.created' | 'user.invited' | 'user.deleted'
  | 'threat.detected'
  | 'report.generated'
  | 'subscription.created' | 'subscription.updated' | 'subscription.cancelled';

@Entity('webhooks')
export class Webhook extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'secret_hash', length: 255, nullable: true })
  secretHash: string;

  @Column({ type: 'jsonb', default: [] })
  events: WebhookEvent[];

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  headers: Record<string, string>;

  @Column({ name: 'last_triggered_at', type: 'timestamptz', nullable: true })
  lastTriggeredAt: Date;

  @Column({ name: 'last_status_code', nullable: true })
  lastStatusCode: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string;

  @Column({ name: 'failure_count', default: 0 })
  failureCount: number;
}
