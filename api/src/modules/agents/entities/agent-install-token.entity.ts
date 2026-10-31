import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Location } from '../../locations/entities/location.entity';

export type AgentRole = 'site-updater' | 'dns-enforce';

@Entity('agent_install_tokens')
export class AgentInstallToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location | null;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  @Exclude()
  tokenHash: string;

  @Column({ name: 'token_prefix', type: 'varchar', length: 12 })
  tokenPrefix: string;

  @Column({ type: 'jsonb', default: ['dns-enforce'] })
  roles: AgentRole[];

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
