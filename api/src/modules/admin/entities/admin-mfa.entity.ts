// Nebula DNS - Admin MFA Entity
// TOTP secrets and backup codes for admin authentication
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Admin } from './admin.entity';

@Entity('admin_mfa')
export class AdminMfa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @OneToOne(() => Admin)
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()
  secret: string;

  @Column({ name: 'backup_codes', type: 'jsonb', default: [] })
  @Exclude()
  backupCodes: string[];

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
