// Nebula DNS - Family Module Entity
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { TenantScopedEntity } from '@/common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import * as bcrypt from 'bcrypt';

export type FamilyMemberRole = 'parent' | 'teen' | 'child';
export type DeviceType =
  | 'phone'
  | 'tablet'
  | 'laptop'
  | 'desktop'
  | 'gaming'
  | 'tv';
export type ScheduleType = 'bedtime' | 'homework' | 'screen_time';

export interface FamilyDevice {
  id: string;
  name: string;
  type: DeviceType;
  macAddress?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface DaySchedule {
  enabled: boolean;
  times?: TimeRange[];
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface BedtimeSchedule {
  type: 'bedtime';
  enabled: boolean;
  schedule: WeekSchedule;
  blockAll: boolean; // Block all internet during bedtime
}

export interface HomeworkSchedule {
  type: 'homework';
  enabled: boolean;
  schedule: WeekSchedule;
  allowedCategories: string[]; // e.g., ['education', 'reference', 'research']
  blockedCategories: string[]; // e.g., ['social_media', 'gaming', 'streaming']
}

export interface ScreenTimeSchedule {
  type: 'screen_time';
  enabled: boolean;
  dailyLimitMinutes: number;
  weekendLimitMinutes?: number;
  resetTime: string; // HH:mm format, when daily limit resets
  extendableMinutes?: number; // Bonus minutes that can be earned
}

export type Schedule = BedtimeSchedule | HomeworkSchedule | ScreenTimeSchedule;

export interface PolicyOverride {
  blockedCategories?: string[];
  allowedCategories?: string[];
  blockedDomains?: string[];
  allowedDomains?: string[];
  safeSearch: boolean;
  youtubeRestricted: boolean;
}

export interface ScreenTimeStats {
  today: number; // minutes
  weekAverage: number; // minutes
  byCategory: Array<{
    category: string;
    minutes: number;
    color: string;
  }>;
}

@Entity('family_members')
export class FamilyMember extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  avatar: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'child',
  })
  role: FamilyMemberRole;

  @Column('jsonb', { default: '[]' })
  devices: FamilyDevice[];

  @Column('jsonb', { name: 'policy_overrides', default: '{}' })
  policyOverrides: PolicyOverride;

  @Column('jsonb', { default: '[]' })
  schedules: Schedule[];

  @Column('jsonb', { name: 'screen_time', default: '{}' })
  screenTime: ScreenTimeStats;

  @Column({
    name: 'parental_pin_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  parentalPinHash: string | null;

  @Column({ name: 'is_online', type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ name: 'last_activity_at', type: 'timestamptz', nullable: true })
  lastActivityAt: Date | null;

  // Virtual property for PIN (not stored)
  private _parentalPin?: string;

  set parentalPin(value: string | undefined) {
    this._parentalPin = value;
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPin() {
    if (this._parentalPin) {
      this.parentalPinHash = await bcrypt.hash(this._parentalPin, 10);
    }
  }

  async verifyPin(pin: string): Promise<boolean> {
    if (!this.parentalPinHash) {
      return false;
    }
    return bcrypt.compare(pin, this.parentalPinHash);
  }
}
