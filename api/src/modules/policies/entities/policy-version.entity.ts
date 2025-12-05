import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Policy } from './policy.entity';

export interface PolicyConfig {
  blockCategories: string[];
  threatBlocking: {
    enabled: boolean;
    feeds: string[];
  };
  safesearch: {
    enabled: boolean;
    services: string[];
  };
  schedules: PolicySchedule[];
}

export interface PolicySchedule {
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
  timezone: string;
  additionalCategories: string[];
}

@Entity('policy_versions')
export class PolicyVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb' })
  config: PolicyConfig;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'text', nullable: true })
  changelog: string;

  @ManyToOne(() => Policy, (policy) => policy.versions)
  @JoinColumn({ name: 'policy_id' })
  policy: Policy;
}
