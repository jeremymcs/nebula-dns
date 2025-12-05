import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('locations')
@Index(['tenant_id'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, name: 'doh_token_hash' })
  dohTokenHash: string;

  @Column({ type: 'timestamptz', name: 'doh_token_issued_at' })
  dohTokenIssuedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'dot_cert_serial_number' })
  dotCertSerialNumber: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'dot_cert_issued_at' })
  dotCertIssuedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'dot_cert_expires_at' })
  dotCertExpiresAt: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'suspended' | 'deleted';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
