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

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PlaybookTrigger,
    default: PlaybookTrigger.MANUAL,
  })
  trigger: PlaybookTrigger;

  @Column({ type: 'jsonb', default: {} })
  triggerConditions: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  actions: { type: PlaybookAction; config: Record<string, any> }[];

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ default: 0 })
  runCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
