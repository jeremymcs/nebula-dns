/**
 * Nebula DNS - MSP Template DTOs
 * Data Transfer Objects for MSP template operations
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsArray,
  IsIn,
  IsUUID,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// Reuse config DTOs from policy module
class ThreatBlockingConfigDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  feeds: string[];
}

class SafeSearchSettingsDto {
  @ApiPropertyOptional({ enum: ['off', 'moderate', 'strict'], default: 'off' })
  @IsOptional()
  @IsIn(['off', 'moderate', 'strict'])
  google?: 'off' | 'moderate' | 'strict';

  @ApiPropertyOptional({ enum: ['off', 'moderate', 'strict'], default: 'off' })
  @IsOptional()
  @IsIn(['off', 'moderate', 'strict'])
  bing?: 'off' | 'moderate' | 'strict';

  @ApiPropertyOptional({ enum: ['off', 'moderate', 'strict'], default: 'off' })
  @IsOptional()
  @IsIn(['off', 'moderate', 'strict'])
  youtube?: 'off' | 'moderate' | 'strict';

  @ApiPropertyOptional({ enum: ['off', 'moderate', 'strict'], default: 'off' })
  @IsOptional()
  @IsIn(['off', 'moderate', 'strict'])
  duckduckgo?: 'off' | 'moderate' | 'strict';
}

class SafeSearchConfigDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  services: string[];

  @ApiPropertyOptional({ type: SafeSearchSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SafeSearchSettingsDto)
  settings?: SafeSearchSettingsDto;
}

class ScheduleConfigDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  days: string[];

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  timezone: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  additionalCategories: string[];
}

export class MspTemplateConfigDto {
  @ApiProperty({
    type: [String],
    description: 'Categories to block completely',
    example: ['adult', 'malware', 'phishing'],
  })
  @IsArray()
  @IsString({ each: true })
  blockCategories: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Categories to warn users about but allow access',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnCategories?: string[];

  @ApiProperty({ type: ThreatBlockingConfigDto })
  @ValidateNested()
  @Type(() => ThreatBlockingConfigDto)
  threatBlocking: ThreatBlockingConfigDto;

  @ApiProperty({ type: SafeSearchConfigDto })
  @ValidateNested()
  @Type(() => SafeSearchConfigDto)
  safesearch: SafeSearchConfigDto;

  @ApiPropertyOptional({ type: [ScheduleConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleConfigDto)
  schedules?: ScheduleConfigDto[];

  @ApiPropertyOptional({
    description: 'Name to use when creating policy from template',
    example: 'Security Policy',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  policyName?: string;

  @ApiPropertyOptional({
    description: 'Description to use when creating policy from template',
  })
  @IsOptional()
  @IsString()
  policyDescription?: string;
}

export class CreateMspTemplateDto {
  @ApiProperty({
    example: 'K-12 Education',
    description: 'Template name',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'CIPA compliant filtering for schools',
    description: 'Template description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    type: MspTemplateConfigDto,
    description: 'Policy configuration to apply',
  })
  @ValidateNested()
  @Type(() => MspTemplateConfigDto)
  @IsObject()
  config: MspTemplateConfigDto;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether this is a default template',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: 'Education',
    description: 'Template category for organization',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['cipa', 'k12', 'school'],
    description: 'Tags for filtering templates',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];
}

export class UpdateMspTemplateDto extends PartialType(CreateMspTemplateDto) {}

export class DeployTemplateDto {
  @ApiProperty({
    type: [String],
    description: 'List of tenant IDs to deploy the template to',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  tenantIds: string[];

  @ApiPropertyOptional({
    enum: ['new_tenant', 'overlay'],
    default: 'overlay',
    description:
      'Deployment mode - overlay adds to existing, new_tenant creates fresh',
  })
  @IsOptional()
  @IsIn(['new_tenant', 'overlay'])
  mode?: 'new_tenant' | 'overlay';
}

export class MspTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  config: MspTemplateConfigDto;

  @ApiProperty()
  version: number;

  @ApiProperty()
  isDefault: boolean;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  deployedTo: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DeploymentResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  totalTenants: number;

  @ApiProperty()
  successfulDeployments: number;

  @ApiProperty()
  failedDeployments: number;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        status: { type: 'string', enum: ['success', 'failed'] },
        policyId: { type: 'string' },
        error: { type: 'string' },
      },
    },
  })
  results: Array<{
    tenantId: string;
    status: 'success' | 'failed';
    policyId?: string;
    error?: string;
  }>;
}
