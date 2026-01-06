/**
 * Family Module DTOs
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FamilyRole {
  PARENT = 'parent',
  TEEN = 'teen',
  CHILD = 'child',
}

export class BedtimeDto {
  @ApiProperty({ example: '21:00' })
  @IsString()
  start: string;

  @ApiProperty({ example: '07:00' })
  @IsString()
  end: string;
}

export class MemberRestrictionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BedtimeDto)
  bedtime?: BedtimeDto;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  dailyLimit?: number;

  @ApiProperty({ type: [String], example: ['adult', 'gambling'] })
  @IsArray()
  @IsString({ each: true })
  blockedCategories: string[];

  @ApiProperty({ type: [String], example: ['youtube-kids'] })
  @IsArray()
  @IsString({ each: true })
  allowedApps: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  safeSearch: boolean;
}

export class CreateFamilyMemberDto {
  @ApiProperty({ example: 'Emma' })
  @IsString()
  name: string;

  @ApiProperty({ example: '👧' })
  @IsString()
  avatar: string;

  @ApiProperty({ enum: FamilyRole, example: FamilyRole.CHILD })
  @IsEnum(FamilyRole)
  role: FamilyRole;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => MemberRestrictionsDto)
  restrictions?: MemberRestrictionsDto;
}

export class UpdateFamilyMemberDto {
  @ApiPropertyOptional({ example: 'Emma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '👧' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ enum: FamilyRole })
  @IsOptional()
  @IsEnum(FamilyRole)
  role?: FamilyRole;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => MemberRestrictionsDto)
  restrictions?: MemberRestrictionsDto;
}

export enum DeviceType {
  PHONE = 'phone',
  TABLET = 'tablet',
  LAPTOP = 'laptop',
  DESKTOP = 'desktop',
  GAMING = 'gaming',
  TV = 'tv',
}

export class AssignDeviceDto {
  @ApiProperty({ example: 'device-uuid' })
  @IsString()
  deviceId: string;

  @ApiProperty({ example: "Emma's iPad" })
  @IsString()
  name: string;

  @ApiProperty({ enum: DeviceType, example: DeviceType.TABLET })
  @IsEnum(DeviceType)
  type: DeviceType;
}
