// Nebula DNS - Webhook Delivery Entity
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Webhook } from './webhook.entity';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'webhook_id', type: 'uuid' })
  webhookId: string;

  @ManyToOne(() => Webhook)
  @JoinColumn({ name: 'webhook_id' })
  webhook: Webhook;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody: string | null;

  @Column({ name: 'response_time_ms', type: 'int', nullable: true })
  responseTimeMs: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'idempotency_key', type: 'uuid', nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
