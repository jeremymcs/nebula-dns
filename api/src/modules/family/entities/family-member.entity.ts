/**
 * Family Member Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('family_members')
export class FamilyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ default: '👤' })
  avatar: string;

  @Column({
    type: 'enum',
    enum: ['parent', 'teen', 'child'],
    default: 'child',
  })
  role: 'parent' | 'teen' | 'child';

  @Column('jsonb', { default: '[]' })
  devices: Array<{
    id: string;
    name: string;
    type: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'gaming' | 'tv';
    isOnline: boolean;
    lastSeen?: string;
  }>;

  @Column('jsonb', {
    default: JSON.stringify({
      blockedCategories: ['adult', 'gambling'],
      allowedApps: [],
      safeSearch: true,
    }),
  })
  restrictions: {
    bedtime?: { start: string; end: string };
    dailyLimit?: number;
    blockedCategories: string[];
    allowedApps: string[];
    safeSearch: boolean;
  };

  @Column('jsonb', {
    default: JSON.stringify({
      today: 0,
      weekAverage: 0,
      byCategory: [],
    }),
  })
  screenTime: {
    today: number;
    weekAverage: number;
    byCategory: Array<{ category: string; minutes: number; color: string }>;
  };

  @Column({ default: false })
  isOnline: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
