// Nebula DNS - Admin Invitation Entity
// Manages admin user invitation workflow with secure token-based acceptance
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Admin } from './admin.entity';
import { AdminRole } from '../enums/admin-role.enum';

/**
 * AdminInvitationStatus
 *
 * Tracks the lifecycle of an admin invitation:
 * - pending: Invitation sent, awaiting acceptance
 * - accepted: Admin account created from this invitation
 * - expired: Invitation passed expiry time
 * - revoked: Manually cancelled before acceptance
 */
export type AdminInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'revoked';

/**
 * AdminInvitation Entity
 *
 * Stores invitation data for new admin users. Uses secure token hashing
 * for invitation links and tracks invitation lifecycle.
 *
 * Security:
 * - tokenHash stores SHA256 hash (not raw token)
 * - expiresAt enforces time-limited invitations
 * - status tracks acceptance and revocation
 */
@Entity('admin_invitations')
export class AdminInvitation extends BaseEntity {
  @Column({ name: 'invited_by_admin_id', type: 'uuid' })
  invitedByAdminId: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'invited_by_admin_id' })
  invitedBy: Admin;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  role: AdminRole;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AdminInvitationStatus;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;
}
