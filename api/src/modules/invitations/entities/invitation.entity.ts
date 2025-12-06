import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type InvitationRole = 'owner' | 'admin' | 'analyst' | 'readonly';

@Entity('team_invitations')
export class Invitation extends BaseEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'invited_by' })
  invitedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invited_by' })
  invitedBy: User;

  @Column({ length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  role: InvitationRole;

  @Column({ name: 'token_hash', length: 255, unique: true })
  tokenHash: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: InvitationStatus;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}
