import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export type SignupStatus = 'pending' | 'payment_pending' | 'completed' | 'failed' | 'expired';

@Entity('signup_requests')
export class SignupRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  companyName: string;

  @Column({ name: 'plan_id', type: 'varchar', length: 50 })
  planId: string;

  @Column({ type: 'varchar', length: 20, default: 'monthly', name: 'billing_cycle' })
  billingCycle: 'monthly' | 'yearly';

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: SignupStatus;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'stripe_checkout_session_id' })
  stripeCheckoutSessionId: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'inet', nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date;
}
