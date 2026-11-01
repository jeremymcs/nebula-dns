// Nebula DNS - Audit Log Entity
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'password_change'
  | 'password_reset'
  | 'invite_sent'
  | 'invite_accepted'
  | 'token_rotate'
  | 'api_key_create'
  | 'api_key_revoke'
  | 'export'
  | 'import'
  | 'msp_context_switch'
  | 'subscription_grace_period_started'
  | 'subscription_suspended'
  | 'subscription_restored'
  | 'grace_period_extended'
  | 'trial_started'
  | 'trial_converted'
  | 'trial_expired'
  | 'family_invite_sent'
  | 'family_invite_accepted'
  | 'family_member_removed'
  | 'template_applied'
  | 'template_rollback'
  | 'admin_impersonation_start'
  | 'admin_impersonation_end'
  | 'billing_credit_applied'
  | 'billing_tier_changed'
  | 'billing_trial_extended'
  | 'billing_grace_extended'
  | 'billing_setup_intent_created'
  | 'billing_payment_method_default_set'
  | 'billing_payment_method_deleted'
  | 'admin_role_changed'
  | 'rbac_denied'
  | 'rbac_shadow_denied'
  | 'dns_zone_assigned'
  | 'dns_zone_unassigned'
  | 'dns_zone_created';

export type AuditResourceType =
  | 'user'
  | 'policy'
  | 'location'
  | 'list'
  | 'webhook'
  | 'siem'
  | 'report'
  | 'subscription'
  | 'tenant'
  | 'api_key'
  | 'sso'
  | 'block_page'
  | 'access_request'
  | 'template'
  | 'admin'
  | 'dns_platform_connection'
  | 'dns_zone_assignment'
  | 'dns_record'
  | 'dns_tenant_connection';

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

  @Column({
    name: 'resource_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
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

  @Column({
    name: 'previous_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  previousHash: string | null;

  @Column({ name: 'record_hash', type: 'varchar', length: 64, default: '' })
  recordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
