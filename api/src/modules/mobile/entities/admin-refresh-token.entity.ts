import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('admin_refresh_tokens')
@Index('IDX_admin_refresh_tokens_hash', ['tokenHash'], { unique: true })
@Index('IDX_admin_refresh_tokens_family', ['familyId'])
@Index('IDX_admin_refresh_tokens_admin', ['adminId'])
export class AdminRefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @Column({ name: 'token_hash', length: 128 })
  tokenHash: string;

  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string | null;

  @Column({ name: 'session_jti', length: 64 })
  sessionJti: string;

  @Column({ name: 'mfa_verified', default: false })
  mfaVerified: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'replaced_by_id', type: 'uuid', nullable: true })
  replacedById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
