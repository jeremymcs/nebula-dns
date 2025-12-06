import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Location } from '../../locations/entities/location.entity';
import { User } from '../../users/entities/user.entity';

export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

@Entity('access_requests')
export class AccessRequest extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'location_id', nullable: true })
  locationId: string;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ length: 255 })
  domain: string;

  @Column({ length: 50, nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'requester_ip', type: 'inet', nullable: true })
  requesterIp: string;

  @Column({ name: 'requester_email', length: 255, nullable: true })
  requesterEmail: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AccessRequestStatus;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;
}
