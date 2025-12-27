import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Partner } from '../../modules/partners/entities/partner.entity';
import { Location } from '../../locations/entities/location.entity';
import { User } from '../../users/entities/user.entity';

@Entity('tenants')
@Index(['partnerId'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'partner_id', nullable: true })
  partnerId: string | null;

  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  domain: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'suspended' | 'deleted';

  @Column({ type: 'varchar', length: 20, default: 'starter' })
  plan: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Column({ type: 'varchar', length: 255, name: 'contact_email', nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', length: 50, name: 'contact_phone', nullable: true })
  contactPhone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string | null;

  @Column({ type: 'varchar', length: 50, name: 'company_size', nullable: true })
  companySize: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  // Relations
  @OneToMany(() => Location, (location) => location.tenant)
  locations: Location[];

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];
}
