// Nebula DNS - Alert Configuration Entity
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  AlertProviderType,
  AlertSeverity,
  AlertEventType,
} from '../interfaces/alert-provider.interface';

/**
 * Alert configuration entity
 * Stores encrypted credentials for external alerting providers (Slack, PagerDuty)
 */
@Entity('alert_configs')
export class AlertConfig extends BaseEntity {
  @Column({ name: 'provider_type', type: 'varchar', length: 20 })
  providerType: AlertProviderType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  /**
   * Encrypted configuration storage
   * Slack: { webhookUrl: encrypted }
   * PagerDuty: { routingKey: encrypted }
   */
  @Column({ name: 'config_encrypted', type: 'jsonb', default: {} })
  configEncrypted: Record<string, string>;

  /**
   * Which severity levels to send to this channel
   * Default: ['critical', 'error']
   */
  @Column({
    name: 'severity_filter',
    type: 'varchar',
    array: true,
    default: () => '\'{"critical","error"}\'',
  })
  severityFilter: AlertSeverity[];

  /**
   * Which event types to send (empty = all types)
   * Default: [] (all types)
   */
  @Column({
    name: 'event_types',
    type: 'varchar',
    array: true,
    default: () => "'{}'",
  })
  eventTypes: AlertEventType[];

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount: number;
}
