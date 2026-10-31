import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum PlaybookTrigger {
  THREAT_DETECTED = 'threat_detected',
  HIGH_BLOCK_RATE = 'high_block_rate',
  NEW_DOMAIN = 'new_domain',
  POLICY_VIOLATION = 'policy_violation',
  MANUAL = 'manual',
}

export enum PlaybookAction {
  BLOCK_DOMAIN = 'block_domain',
  ALLOW_DOMAIN = 'allow_domain',
  SEND_ALERT = 'send_alert',
  CREATE_TICKET = 'create_ticket',
  RUN_INVESTIGATION = 'run_investigation',
}

@Entity('playbooks')
export class Playbook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PlaybookTrigger,
    enumName: 'playbooks_trigger_enum',
    default: PlaybookTrigger.MANUAL,
  })
  trigger: PlaybookTrigger;

  @Column({ name: 'trigger_conditions', type: 'jsonb', default: {} })
  triggerConditions: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  actions: { type: PlaybookAction; config: Record<string, any> }[];

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'run_count', type: 'int', default: 0 })
  runCount: number;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
