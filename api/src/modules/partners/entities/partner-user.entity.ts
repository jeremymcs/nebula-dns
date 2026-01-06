import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@/common/entities/base.entity';
import { Partner } from './partner.entity';

export type PartnerUserRole =
  | 'partner_owner'
  | 'partner_admin'
  | 'partner_support'
  | 'partner_billing';
export type PartnerUserStatus = 'active' | 'suspended' | 'pending';

@Entity('partner_users')
export class PartnerUser extends BaseEntity {
  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId: string;

  @ManyToOne(() => Partner)
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'varchar', length: 30 })
  role: PartnerUserRole;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: PartnerUserStatus;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  @Exclude()
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  @Exclude()
  lockedUntil: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'mfa_enabled', type: 'boolean', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret', type: 'varchar', length: 255, nullable: true })
  @Exclude()
  mfaSecret: string | null;

  // Track which organization the partner user is currently impersonating
  @Column({ name: 'impersonating_org_id', type: 'uuid', nullable: true })
  impersonatingOrgId: string | null;
}
