// Nebula DNS - Family Module DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsDateString,
  IsUUID,
  Min,
  Max,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// Note: Types are imported for documentation purposes
// FamilyMemberRole, DeviceType, ScheduleType, PolicyOverride, ScreenTimeStats
// are defined in the entity file and used via enum equivalents here

// Enums for DTOs
export enum FamilyRoleEnum {
  PARENT = 'parent',
  TEEN = 'teen',
  CHILD = 'child',
}

export enum DeviceTypeEnum {
  PHONE = 'phone',
  TABLET = 'tablet',
  LAPTOP = 'laptop',
  DESKTOP = 'desktop',
  GAMING = 'gaming',
  TV = 'tv',
}

export enum ScheduleTypeEnum {
  BEDTIME = 'bedtime',
  HOMEWORK = 'homework',
  SCREEN_TIME = 'screen_time',
}

// Time Range DTO
export class TimeRangeDto {
  @ApiProperty({ example: '21:00', description: 'Start time in HH:mm format' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  start: string;

  @ApiProperty({ example: '07:00', description: 'End time in HH:mm format' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  end: string;
}

// Day Schedule DTO
export class DayScheduleDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ type: [TimeRangeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  times?: TimeRangeDto[];
}

// Week Schedule DTO
export class WeekScheduleDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  monday: DayScheduleDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  tuesday: DayScheduleDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  wednesday: DayScheduleDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  thursday: DayScheduleDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  friday: DayScheduleDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  saturday: DayScheduleDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  sunday: DayScheduleDto;
}

// Bedtime Schedule DTO
export class BedtimeScheduleDto {
  @ApiProperty({ enum: ['bedtime'], example: 'bedtime' })
  @IsString()
  type: 'bedtime';

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty()
  @ValidateNested()
  @Type(() => WeekScheduleDto)
  schedule: WeekScheduleDto;

  @ApiProperty({
    example: true,
    description: 'Block all internet during bedtime',
  })
  @IsBoolean()
  blockAll: boolean;
}

// Homework Schedule DTO
export class HomeworkScheduleDto {
  @ApiProperty({ enum: ['homework'], example: 'homework' })
  @IsString()
  type: 'homework';

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty()
  @ValidateNested()
  @Type(() => WeekScheduleDto)
  schedule: WeekScheduleDto;

  @ApiProperty({
    type: [String],
    example: ['education', 'reference'],
    description: 'Categories allowed during homework time',
  })
  @IsArray()
  @IsString({ each: true })
  allowedCategories: string[];

  @ApiProperty({
    type: [String],
    example: ['social_media', 'gaming'],
    description: 'Categories blocked during homework time',
  })
  @IsArray()
  @IsString({ each: true })
  blockedCategories: string[];
}

// Screen Time Schedule DTO
export class ScreenTimeScheduleDto {
  @ApiProperty({ enum: ['screen_time'], example: 'screen_time' })
  @IsString()
  type: 'screen_time';

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 120, description: 'Daily limit in minutes' })
  @IsNumber()
  @Min(0)
  @Max(1440)
  dailyLimitMinutes: number;

  @ApiPropertyOptional({
    example: 180,
    description: 'Weekend limit in minutes',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  weekendLimitMinutes?: number;

  @ApiProperty({
    example: '06:00',
    description: 'When daily limit resets (HH:mm format)',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Reset time must be in HH:mm format',
  })
  resetTime: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Bonus minutes that can be earned',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(240)
  extendableMinutes?: number;
}

// Policy Override DTO
export class PolicyOverrideDto {
  @ApiPropertyOptional({ type: [String], example: ['adult', 'gambling'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedCategories?: string[];

  @ApiPropertyOptional({ type: [String], example: ['education'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCategories?: string[];

  @ApiPropertyOptional({ type: [String], example: ['bad-site.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedDomains?: string[];

  @ApiPropertyOptional({ type: [String], example: ['safe-site.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  safeSearch: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  youtubeRestricted: boolean;
}

// Create Family Member DTO
export class CreateFamilyMemberDto {
  @ApiProperty({ example: 'Emma', description: 'Family member name' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'avatar-child-1',
    description: 'Avatar identifier',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;

  @ApiPropertyOptional({
    example: '2015-03-15',
    description: 'Date of birth (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    enum: FamilyRoleEnum,
    example: FamilyRoleEnum.CHILD,
    description: 'Member role (parent, teen, child)',
  })
  @IsEnum(FamilyRoleEnum)
  role: FamilyRoleEnum;

  @ApiPropertyOptional({
    description: 'Policy overrides for this member',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyOverrideDto)
  policyOverrides?: PolicyOverrideDto;

  @ApiPropertyOptional({
    example: '1234',
    description: 'Parental PIN (4-6 digits)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4-6 digits' })
  parentalPin?: string;
}

// Update Family Member DTO
export class UpdateFamilyMemberDto {
  @ApiPropertyOptional({ example: 'Emma', description: 'Family member name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'avatar-child-2',
    description: 'Avatar identifier',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;

  @ApiPropertyOptional({
    example: '2015-03-15',
    description: 'Date of birth (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    enum: FamilyRoleEnum,
    description: 'Member role (parent, teen, child)',
  })
  @IsOptional()
  @IsEnum(FamilyRoleEnum)
  role?: FamilyRoleEnum;

  @ApiPropertyOptional({
    description: 'Policy overrides for this member',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyOverrideDto)
  policyOverrides?: PolicyOverrideDto;

  @ApiPropertyOptional({
    example: '1234',
    description: 'Parental PIN (4-6 digits)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4-6 digits' })
  parentalPin?: string;
}

// Assign Device DTO
export class AssignDeviceDto {
  @ApiPropertyOptional({
    example: 'device-uuid-123',
    description: 'Device ID (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ example: "Emma's iPad", description: 'Device name' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    enum: DeviceTypeEnum,
    example: DeviceTypeEnum.TABLET,
    description: 'Device type',
  })
  @IsEnum(DeviceTypeEnum)
  type: DeviceTypeEnum;

  @ApiPropertyOptional({
    example: 'AA:BB:CC:DD:EE:FF',
    description: 'Device MAC address',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, {
    message: 'Invalid MAC address format',
  })
  macAddress?: string;
}

// Set Schedule DTO
export class SetScheduleDto {
  @ApiProperty({
    enum: ScheduleTypeEnum,
    example: ScheduleTypeEnum.BEDTIME,
    description: 'Type of schedule',
  })
  @IsEnum(ScheduleTypeEnum)
  type: ScheduleTypeEnum;

  @ApiProperty({ example: true, description: 'Whether schedule is enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'Schedule configuration (type-specific)',
  })
  @IsOptional()
  config?: BedtimeScheduleDto | HomeworkScheduleDto | ScreenTimeScheduleDto;
}

// Verify PIN DTO
export class VerifyPinDto {
  @ApiProperty({
    example: 'member-uuid-123',
    description: 'Family member ID',
  })
  @IsUUID()
  memberId: string;

  @ApiProperty({
    example: '1234',
    description: 'PIN to verify (4-6 digits)',
  })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4-6 digits' })
  pin: string;
}

// Activity Query DTO
export class ActivityQueryDto {
  @ApiPropertyOptional({
    example: '24h',
    description: 'Time period (24h, 7d, 30d)',
    enum: ['24h', '7d', '30d'],
  })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({
    example: 50,
    description: 'Maximum number of results',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit?: number;
}

// Response DTOs
export class CategoryTimeDto {
  @ApiProperty({ example: 'social_media' })
  category: string;

  @ApiProperty({ example: 45 })
  minutes: number;

  @ApiProperty({ example: '#3b82f6' })
  color: string;
}

export class ScreenTimeStatsDto {
  @ApiProperty({ example: 120, description: 'Minutes used today' })
  today: number;

  @ApiProperty({
    example: 95,
    description: 'Average minutes per day this week',
  })
  weekAverage: number;

  @ApiProperty({ type: [CategoryTimeDto] })
  byCategory: CategoryTimeDto[];
}

export class FamilyMemberActivityDto {
  @ApiProperty({ example: 'member-uuid-123' })
  memberId: string;

  @ApiProperty({ example: 'Emma' })
  memberName: string;

  @ApiProperty()
  screenTime: ScreenTimeStatsDto;

  @ApiProperty({ example: 1234, description: 'Total DNS queries' })
  totalQueries: number;

  @ApiProperty({ example: 56, description: 'Blocked DNS queries' })
  blockedQueries: number;

  @ApiProperty({
    type: [Object],
    description: 'Top accessed domains',
  })
  topDomains: Array<{
    domain: string;
    count: number;
    category: string;
  }>;

  @ApiProperty({
    type: [Object],
    description: 'Top blocked domains',
  })
  topBlocked: Array<{
    domain: string;
    count: number;
    reason: string;
  }>;
}

// Export legacy type for backwards compatibility
export { FamilyRoleEnum as FamilyRole };
