// Nebula DNS - Webhook Idempotency Entity
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Webhook } from './webhook.entity';

/**
 * WebhookIdempotencyKey stores delivered webhook event keys to prevent
 * duplicate deliveries. Keys are retained for 7 days before cleanup.
 *
 * Consumers should use the X-Idempotency-Key header to detect and
 * deduplicate webhook events on their end.
 */
@Entity('webhook_idempotency_keys')
@Index('idx_webhook_idempotency_webhook_id', ['webhookId'])
@Index('idx_webhook_idempotency_delivered_at', ['deliveredAt'])
export class WebhookIdempotencyKey {
  @PrimaryColumn({ type: 'uuid' })
  key: string;

  @Column({ name: 'webhook_id', type: 'uuid' })
  webhookId: string;

  @ManyToOne(() => Webhook, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webhook_id' })
  webhook: Webhook;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: string;

  @CreateDateColumn({ name: 'delivered_at', type: 'timestamptz' })
  deliveredAt: Date;

  @Column({ default: false })
  acknowledged: boolean;

  @Column({ name: 'response_status', type: 'int', nullable: true })
  responseStatus: number | null;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody: string | null;
}
