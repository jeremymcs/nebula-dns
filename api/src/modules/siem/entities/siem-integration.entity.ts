import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type SiemIntegrationType = 'splunk' | 'elastic' | 'sentinel' | 'syslog' | 'webhook';

@Entity('siem_integrations')
export class SiemIntegration extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'integration_type', type: 'varchar', length: 20 })
  integrationType: SiemIntegrationType;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column({ name: 'config_encrypted', type: 'jsonb', default: {} })
  configEncrypted: Record<string, any>;

  @Column({ name: 'log_types', type: 'jsonb', default: ['blocked', 'threats'] })
  logTypes: string[];

  @Column({ name: 'include_allowed', default: false })
  includeAllowed: boolean;

  @Column({ name: 'min_severity', length: 20, default: 'low' })
  minSeverity: string;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'error_count', default: 0 })
  errorCount: number;
}
