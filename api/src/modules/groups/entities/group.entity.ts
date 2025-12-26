import { Entity, Column, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Policy } from '../../policies/entities/policy.entity';

@Entity('user_groups')
export class UserGroup extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  policyId: string | null;

  @ManyToOne(() => Policy)
  @JoinColumn({ name: 'policy_id' })
  policy: Policy;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'user_group_members',
    joinColumn: { name: 'group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];

  @Column({ type: 'int', default: 0 })
  priority: number; // Higher priority groups take precedence
}

