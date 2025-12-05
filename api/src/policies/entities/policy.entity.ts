import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

@Entity('policies')
@Index(['tenant_id', 'version'], { unique: true })
@Index(['tenant_id', 'is_active'])
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  config: {
    block_categories?: string[];
    block_threats?: boolean;
    safe_search_enabled?: boolean;
    schedule?: any;
    allowlist_enabled?: boolean;
    blocklist_enabled?: boolean;
  };

  @Column({ type: 'boolean', default: false, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
