import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Location } from '../../locations/entities/location.entity';
import { User } from '../../users/entities/user.entity';

export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

@Entity('access_requests')
export class AccessRequest extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'varchar', length: 255 })
  domain: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'requester_ip', type: 'inet', nullable: true })
  requesterIp: string;

  @Column({
    name: 'requester_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  requesterEmail: string;

  @Column({
    name: 'requester_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  requesterName: string | null;

  @Column({
    name: 'block_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  blockReason: string | null;

  @Column({ name: 'allow_list_id', type: 'uuid', nullable: true })
  allowListId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AccessRequestStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}
