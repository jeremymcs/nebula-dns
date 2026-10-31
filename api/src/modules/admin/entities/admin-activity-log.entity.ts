// Nebula DNS - Admin Activity Log Entity
// Immutable audit trail for all admin actions
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Admin } from './admin.entity';

/**
 * AdminActivityAction
 *
 * Enumeration of all admin actions that are logged:
 * - Authentication: login, logout, failed login attempts
 * - User Management: invited, created, suspended, reactivated, deleted
 * - Security: role changes, MFA resets, password changes
 * - Invitations: invite revocation
 */
export type AdminActivityAction =
  | 'admin_login'
  | 'admin_logout'
  | 'admin_login_failed'
  | 'admin_invited'
  | 'admin_created'
  | 'admin_suspended'
  | 'admin_reactivated'
  | 'admin_role_changed'
  | 'admin_mfa_reset'
  | 'admin_deleted'
  | 'admin_password_changed'
  | 'invite_revoked'
  | 'dns_platform_connection_set'
  | 'dns_platform_connection_verified'
  | 'dns_platform_connection_revoked'
  | 'dns_platform_zones_synced'
  | 'dns_platform_zone_created';

/**
 * AdminActivityLog Entity
 *
 * Immutable audit trail for all admin actions. Does not extend BaseEntity
 * since it only needs id and createdAt (no updates allowed).
 *
 * Structure:
 * - adminId: Who performed the action (actor)
 * - action: What type of action was performed
 * - targetAdminId: Who was affected (optional)
 * - metadata: Additional context (JSON)
 * - ipAddress: Source IP for security tracking
 * - createdAt: When the action occurred
 *
 * Note: No updatedAt since logs are append-only
 */
@Entity('admin_activity_logs')
export class AdminActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @Column({ type: 'varchar', length: 50 })
  action: AdminActivityAction;

  @Column({ name: 'target_admin_id', type: 'uuid', nullable: true })
  targetAdminId: string | null;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'target_admin_id' })
  targetAdmin: Admin | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
