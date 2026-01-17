// Nebula DNS - Admin Entity (Non-Tenant-Scoped)
// Global system administrators for internal operations
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Entity, Column, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@/common/entities/base.entity';

export type AdminStatus = 'active' | 'suspended' | 'pending_mfa';

@Entity('admins')
export class Admin extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'pending_mfa' })
  status: AdminStatus;

  @Column({ name: 'mfa_setup_complete', type: 'boolean', default: false })
  mfaSetupComplete: boolean;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  @Exclude()
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  @Exclude()
  lockedUntil: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'invited_by_admin_id', type: 'uuid', nullable: true })
  invitedByAdminId: string | null;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'invited_by_admin_id' })
  invitedByAdmin: Admin | null;
}
