import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { User } from '../../modules/users/entities/user.entity';

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'login' | 'logout' | 'login_failed'
  | 'mfa_enabled' | 'mfa_disabled'
  | 'password_change' | 'password_reset'
  | 'invite_sent' | 'invite_accepted'
  | 'token_rotate' | 'api_key_create' | 'api_key_revoke'
  | 'export' | 'import';

export type AuditResourceType =
  | 'user' | 'policy' | 'location' | 'list'
  | 'webhook' | 'siem' | 'report' | 'subscription'
  | 'tenant' | 'api_key' | 'sso' | 'block_page';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  action: AuditAction;

  @Column({ name: 'resource_type', type: 'varchar', length: 50 })
  resourceType: AuditResourceType;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string | null;

  @Column({ name: 'resource_name', type: 'varchar', length: 255, nullable: true })
  resourceName: string | null;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, any> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any> | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

