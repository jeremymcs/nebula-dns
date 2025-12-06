import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Webhook } from './webhook.entity';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'webhook_id' })
  webhookId: string;

  @ManyToOne(() => Webhook)
  @JoinColumn({ name: 'webhook_id' })
  webhook: Webhook;

  @Column({ name: 'event_type', length: 50 })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'status_code', nullable: true })
  statusCode: number | null;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody: string | null;

  @Column({ name: 'response_time_ms', nullable: true })
  responseTimeMs: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
