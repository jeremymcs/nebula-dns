// Nebula DNS - Family Module Service
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  FamilyMember,
  Schedule,
  BedtimeSchedule,
  HomeworkSchedule,
  ScreenTimeSchedule,
  PolicyOverride,
  WeekSchedule,
} from './entities/family-member.entity';
import {
  CreateFamilyMemberDto,
  UpdateFamilyMemberDto,
  AssignDeviceDto,
  SetScheduleDto,
  VerifyPinDto,
  FamilyMemberActivityDto,
  ScheduleTypeEnum,
} from './dto/family.dto';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(
    @InjectRepository(FamilyMember)
    private readonly familyMemberRepository: Repository<FamilyMember>,
    private readonly clickHouseService: ClickHouseService,
  ) {}

  /**
   * Get all family members for a tenant
   */
  async findAll(tenantId: string): Promise<FamilyMember[]> {
    return this.familyMemberRepository.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get a single family member by ID
   */
  async findOne(tenantId: string, id: string): Promise<FamilyMember> {
    const member = await this.familyMemberRepository.findOne({
      where: { id, tenantId },
    });

    if (!member) {
      throw new NotFoundException(`Family member ${id} not found`);
    }

    return member;
  }

  /**
   * Create a new family member
   */
  async create(
    tenantId: string,
    dto: CreateFamilyMemberDto,
  ): Promise<FamilyMember> {
    // Set default policy overrides based on role
    const defaultPolicyOverrides = this.getDefaultPolicyOverrides(dto.role);

    const member = this.familyMemberRepository.create({
      tenantId,
      name: dto.name,
      avatar: dto.avatar || '',
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      role: dto.role,
      policyOverrides: dto.policyOverrides || defaultPolicyOverrides,
      devices: [],
      schedules: this.getDefaultSchedules(dto.role),
      screenTime: { today: 0, weekAverage: 0, byCategory: [] },
      isOnline: false,
      lastActivityAt: null,
    });

    // Handle PIN if provided
    if (dto.parentalPin) {
      member.parentalPin = dto.parentalPin;
    }

    const saved = await this.familyMemberRepository.save(member);
    this.logger.log(`Created family member ${saved.id} for tenant ${tenantId}`);

    return saved;
  }

  /**
   * Update a family member
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateFamilyMemberDto,
  ): Promise<FamilyMember> {
    const member = await this.findOne(tenantId, id);

    if (dto.name !== undefined) member.name = dto.name;
    if (dto.avatar !== undefined) member.avatar = dto.avatar;
    if (dto.dateOfBirth !== undefined) {
      member.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }
    if (dto.role !== undefined) member.role = dto.role;
    if (dto.policyOverrides !== undefined) {
      member.policyOverrides = dto.policyOverrides as PolicyOverride;
    }
    if (dto.parentalPin !== undefined) {
      member.parentalPin = dto.parentalPin;
    }

    const saved = await this.familyMemberRepository.save(member);
    this.logger.log(`Updated family member ${id} for tenant ${tenantId}`);

    return saved;
  }

  /**
   * Remove a family member
   */
  async remove(tenantId: string, id: string): Promise<void> {
    const member = await this.findOne(tenantId, id);
    await this.familyMemberRepository.remove(member);
    this.logger.log(`Removed family member ${id} from tenant ${tenantId}`);
  }

  /**
   * Assign a device to a family member
   */
  async assignDevice(
    tenantId: string,
    memberId: string,
    dto: AssignDeviceDto,
  ): Promise<FamilyMember> {
    const member = await this.findOne(tenantId, memberId);

    const deviceId = dto.deviceId || uuidv4();

    // Check if device already assigned
    const existingIndex = member.devices.findIndex((d) => d.id === deviceId);

    if (existingIndex >= 0) {
      // Update existing device
      member.devices[existingIndex] = {
        ...member.devices[existingIndex],
        name: dto.name,
        type: dto.type,
        macAddress: dto.macAddress,
      };
    } else {
      // Add new device
      member.devices.push({
        id: deviceId,
        name: dto.name,
        type: dto.type,
        macAddress: dto.macAddress,
        isOnline: false,
      });
    }

    const saved = await this.familyMemberRepository.save(member);
    this.logger.log(`Assigned device ${deviceId} to family member ${memberId}`);

    return saved;
  }

  /**
   * Remove a device from a family member
   */
  async removeDevice(
    tenantId: string,
    memberId: string,
    deviceId: string,
  ): Promise<FamilyMember> {
    const member = await this.findOne(tenantId, memberId);

    const deviceIndex = member.devices.findIndex((d) => d.id === deviceId);
    if (deviceIndex === -1) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    member.devices.splice(deviceIndex, 1);

    const saved = await this.familyMemberRepository.save(member);
    this.logger.log(
      `Removed device ${deviceId} from family member ${memberId}`,
    );

    return saved;
  }

  /**
   * Set a schedule for a family member
   */
  async setSchedule(
    tenantId: string,
    memberId: string,
    dto: SetScheduleDto,
  ): Promise<FamilyMember> {
    const member = await this.findOne(tenantId, memberId);

    // Find existing schedule of this type
    const existingIndex = member.schedules.findIndex(
      (s) => s.type === dto.type,
    );

    let schedule: Schedule;

    switch (dto.type) {
      case ScheduleTypeEnum.BEDTIME:
        schedule = this.createBedtimeSchedule(dto);
        break;
      case ScheduleTypeEnum.HOMEWORK:
        schedule = this.createHomeworkSchedule(dto);
        break;
      case ScheduleTypeEnum.SCREEN_TIME:
        schedule = this.createScreenTimeSchedule(dto);
        break;
      default:
        throw new BadRequestException(`Invalid schedule type: ${dto.type}`);
    }

    if (existingIndex >= 0) {
      member.schedules[existingIndex] = schedule;
    } else {
      member.schedules.push(schedule);
    }

    const saved = await this.familyMemberRepository.save(member);
    this.logger.log(`Set ${dto.type} schedule for family member ${memberId}`);

    return saved;
  }

  /**
   * Get activity summary for a family member
   */
  async getActivity(
    tenantId: string,
    memberId: string,
    period: string = '24h',
  ): Promise<FamilyMemberActivityDto> {
    const member = await this.findOne(tenantId, memberId);

    // Get device IDs for this member
    const deviceIds = member.devices.map((d) => d.id);

    // If no devices, return empty activity
    if (deviceIds.length === 0) {
      return {
        memberId: member.id,
        memberName: member.name,
        screenTime: member.screenTime,
        totalQueries: 0,
        blockedQueries: 0,
        topDomains: [],
        topBlocked: [],
      };
    }

    // Get stats from ClickHouse
    // Note: In a real implementation, you would filter by device IDs
    // For now, we use tenant-level stats as a placeholder
    const summary = await this.clickHouseService.getSummaryStats(
      tenantId,
      period,
    );
    const topBlocked = await this.clickHouseService.getTopBlocked(
      tenantId,
      period,
      10,
    );

    return {
      memberId: member.id,
      memberName: member.name,
      screenTime: member.screenTime,
      totalQueries: summary.totalQueries,
      blockedQueries: summary.blockedQueries,
      topDomains: [], // Would need device-specific query
      topBlocked: topBlocked.map((item) => ({
        domain: item.domain,
        count: item.count,
        reason: item.category || 'blocked',
      })),
    };
  }

  /**
   * Verify parental PIN for a family member
   */
  async verifyPin(tenantId: string, dto: VerifyPinDto): Promise<boolean> {
    const member = await this.findOne(tenantId, dto.memberId);

    if (!member.parentalPinHash) {
      throw new BadRequestException('No PIN set for this family member');
    }

    const isValid = await member.verifyPin(dto.pin);

    if (!isValid) {
      throw new UnauthorizedException('Invalid PIN');
    }

    return true;
  }

  /**
   * Update screen time for a family member
   */
  async updateScreenTime(
    tenantId: string,
    memberId: string,
    screenTimeData: Partial<{
      today: number;
      weekAverage: number;
      byCategory: Array<{ category: string; minutes: number; color: string }>;
    }>,
  ): Promise<FamilyMember> {
    const member = await this.findOne(tenantId, memberId);

    member.screenTime = {
      ...member.screenTime,
      ...screenTimeData,
    };

    return this.familyMemberRepository.save(member);
  }

  /**
   * Update online status for a family member
   */
  async setOnlineStatus(
    tenantId: string,
    memberId: string,
    isOnline: boolean,
  ): Promise<void> {
    await this.familyMemberRepository.update(
      { id: memberId, tenantId },
      {
        isOnline,
        lastActivityAt: isOnline ? new Date() : undefined,
      },
    );
  }

  /**
   * Get default policy overrides based on role
   */
  private getDefaultPolicyOverrides(role: string): PolicyOverride {
    const base: PolicyOverride = {
      blockedCategories: [],
      allowedCategories: [],
      blockedDomains: [],
      allowedDomains: [],
      safeSearch: true,
      youtubeRestricted: false,
    };

    switch (role) {
      case 'child':
        return {
          ...base,
          blockedCategories: [
            'adult',
            'gambling',
            'violence',
            'drugs',
            'weapons',
            'hate',
            'dating',
          ],
          safeSearch: true,
          youtubeRestricted: true,
        };
      case 'teen':
        return {
          ...base,
          blockedCategories: ['adult', 'gambling', 'drugs', 'weapons'],
          safeSearch: true,
          youtubeRestricted: false,
        };
      case 'parent':
        return {
          ...base,
          safeSearch: false,
          youtubeRestricted: false,
        };
      default:
        return base;
    }
  }

  /**
   * Get default schedules based on role
   */
  private getDefaultSchedules(role: string): Schedule[] {
    const schedules: Schedule[] = [];

    switch (role) {
      case 'child':
        // Bedtime: 8pm - 7am on weekdays, 9pm - 8am on weekends
        schedules.push({
          type: 'bedtime',
          enabled: true,
          schedule: {
            monday: {
              enabled: true,
              times: [{ start: '20:00', end: '07:00' }],
            },
            tuesday: {
              enabled: true,
              times: [{ start: '20:00', end: '07:00' }],
            },
            wednesday: {
              enabled: true,
              times: [{ start: '20:00', end: '07:00' }],
            },
            thursday: {
              enabled: true,
              times: [{ start: '20:00', end: '07:00' }],
            },
            friday: {
              enabled: true,
              times: [{ start: '21:00', end: '08:00' }],
            },
            saturday: {
              enabled: true,
              times: [{ start: '21:00', end: '08:00' }],
            },
            sunday: {
              enabled: true,
              times: [{ start: '20:00', end: '07:00' }],
            },
          },
          blockAll: true,
        });

        // Screen time: 2 hours weekdays, 3 hours weekends
        schedules.push({
          type: 'screen_time',
          enabled: true,
          dailyLimitMinutes: 120,
          weekendLimitMinutes: 180,
          resetTime: '06:00',
          extendableMinutes: 30,
        });
        break;

      case 'teen':
        // Bedtime: 10pm - 6am on school nights
        schedules.push({
          type: 'bedtime',
          enabled: true,
          schedule: {
            monday: {
              enabled: true,
              times: [{ start: '22:00', end: '06:00' }],
            },
            tuesday: {
              enabled: true,
              times: [{ start: '22:00', end: '06:00' }],
            },
            wednesday: {
              enabled: true,
              times: [{ start: '22:00', end: '06:00' }],
            },
            thursday: {
              enabled: true,
              times: [{ start: '22:00', end: '06:00' }],
            },
            friday: { enabled: false },
            saturday: { enabled: false },
            sunday: {
              enabled: true,
              times: [{ start: '23:00', end: '07:00' }],
            },
          },
          blockAll: true,
        });

        // Screen time: 3 hours weekdays, 4 hours weekends
        schedules.push({
          type: 'screen_time',
          enabled: true,
          dailyLimitMinutes: 180,
          weekendLimitMinutes: 240,
          resetTime: '06:00',
          extendableMinutes: 60,
        });
        break;

      case 'parent':
        // No default schedules for parents
        break;
    }

    return schedules;
  }

  /**
   * Create a bedtime schedule from DTO
   */
  private createBedtimeSchedule(dto: SetScheduleDto): BedtimeSchedule {
    const config = dto.config as Partial<BedtimeSchedule> | undefined;

    return {
      type: 'bedtime',
      enabled: dto.enabled,
      schedule: config?.schedule || this.getEmptyWeekSchedule(),
      blockAll: config?.blockAll ?? true,
    };
  }

  /**
   * Create a homework schedule from DTO
   */
  private createHomeworkSchedule(dto: SetScheduleDto): HomeworkSchedule {
    const config = dto.config as Partial<HomeworkSchedule> | undefined;

    return {
      type: 'homework',
      enabled: dto.enabled,
      schedule: config?.schedule || this.getEmptyWeekSchedule(),
      allowedCategories: config?.allowedCategories || [
        'education',
        'reference',
        'research',
      ],
      blockedCategories: config?.blockedCategories || [
        'social_media',
        'gaming',
        'streaming',
      ],
    };
  }

  /**
   * Create a screen time schedule from DTO
   */
  private createScreenTimeSchedule(dto: SetScheduleDto): ScreenTimeSchedule {
    const config = dto.config as Partial<ScreenTimeSchedule> | undefined;

    return {
      type: 'screen_time',
      enabled: dto.enabled,
      dailyLimitMinutes: config?.dailyLimitMinutes || 120,
      weekendLimitMinutes: config?.weekendLimitMinutes,
      resetTime: config?.resetTime || '06:00',
      extendableMinutes: config?.extendableMinutes,
    };
  }

  /**
   * Get an empty week schedule
   */
  private getEmptyWeekSchedule(): WeekSchedule {
    return {
      monday: { enabled: false },
      tuesday: { enabled: false },
      wednesday: { enabled: false },
      thursday: { enabled: false },
      friday: { enabled: false },
      saturday: { enabled: false },
      sunday: { enabled: false },
    };
  }
}
