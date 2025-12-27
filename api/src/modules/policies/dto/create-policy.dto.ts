import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ThreatBlockingConfigDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ type: [String] })
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
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ type: [String] })
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

class PolicyConfigDto {
  @ApiProperty({ type: [String], description: 'Categories to block completely' })
  @IsArray()
  @IsString({ each: true })
  blockCategories: string[];

  @ApiPropertyOptional({ type: [String], description: 'Categories to warn users about but allow access' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnCategories?: string[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => ThreatBlockingConfigDto)
  threatBlocking: ThreatBlockingConfigDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => SafeSearchConfigDto)
  safesearch: SafeSearchConfigDto;

  @ApiPropertyOptional({ type: [ScheduleConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleConfigDto)
  schedules?: ScheduleConfigDto[];
}

export class CreatePolicyDto {
  @ApiProperty({ example: 'Strict Security Policy' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Enhanced protection for sensitive networks' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PolicyConfigDto)
  @IsObject()
  config: PolicyConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
