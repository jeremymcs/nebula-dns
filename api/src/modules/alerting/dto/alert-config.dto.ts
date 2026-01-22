// Nebula DNS - Alert Configuration DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUrl,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AlertSeverity,
  AlertEventType,
  AlertProviderType,
} from '../interfaces/alert-provider.interface';

/**
 * Create Slack configuration DTO
 */
export class CreateSlackConfigDto {
  @ApiProperty({
    description: 'Friendly name for this Slack integration',
    example: 'Critical Alerts - #ops',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Slack webhook URL (must start with https://hooks.slack.com/)',
    example: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
  })
  @IsUrl()
  @IsNotEmpty()
  @Matches(/^https:\/\/hooks\.slack\.com\//, {
    message: 'Webhook URL must start with https://hooks.slack.com/',
  })
  webhookUrl: string;

  @ApiPropertyOptional({
    description: 'Severity levels to send to this channel',
    type: [String],
    enum: ['critical', 'error', 'warning', 'info'],
    default: ['critical', 'error'],
  })
  @IsOptional()
  @IsArray()
  severityFilter?: AlertSeverity[];

  @ApiPropertyOptional({
    description: 'Event types to send (empty = all types)',
    type: [String],
    enum: ['system_health', 'billing', 'security'],
    default: [],
  })
  @IsOptional()
  @IsArray()
  eventTypes?: AlertEventType[];
}

/**
 * Create PagerDuty configuration DTO
 */
export class CreatePagerDutyConfigDto {
  @ApiProperty({
    description: 'Friendly name for this PagerDuty integration',
    example: 'Critical Alerts - Oncall',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'PagerDuty Events API v2 routing key (32 characters)',
    example: 'R031234567890123456789012345678',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  @MaxLength(32)
  routingKey: string;

  @ApiPropertyOptional({
    description:
      'Severity levels to send to PagerDuty (default excludes warning per ALERT-07)',
    type: [String],
    enum: ['critical', 'error', 'warning', 'info'],
    default: ['critical', 'error'],
  })
  @IsOptional()
  @IsArray()
  severityFilter?: AlertSeverity[];

  @ApiPropertyOptional({
    description: 'Event types to send (empty = all types)',
    type: [String],
    enum: ['system_health', 'billing', 'security'],
    default: [],
  })
  @IsOptional()
  @IsArray()
  eventTypes?: AlertEventType[];
}

/**
 * Update alert configuration DTO
 */
export class UpdateAlertConfigDto {
  @ApiPropertyOptional({
    description: 'Update the friendly name',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Enable or disable this alert configuration',
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Update severity filter',
    type: [String],
    enum: ['critical', 'error', 'warning', 'info'],
  })
  @IsOptional()
  @IsArray()
  severityFilter?: AlertSeverity[];

  @ApiPropertyOptional({
    description: 'Update event types filter',
    type: [String],
    enum: ['system_health', 'billing', 'security'],
  })
  @IsOptional()
  @IsArray()
  eventTypes?: AlertEventType[];
}

/**
 * Alert configuration response DTO
 * Does not include encrypted credentials
 */
export class AlertConfigResponseDto {
  @ApiProperty({ description: 'Configuration ID' })
  id: string;

  @ApiProperty({ description: 'Configuration name' })
  name: string;

  @ApiProperty({
    description: 'Provider type',
    enum: ['slack', 'pagerduty'],
  })
  providerType: AlertProviderType;

  @ApiProperty({ description: 'Whether this configuration is enabled' })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Severity filter',
    type: [String],
  })
  severityFilter: AlertSeverity[];

  @ApiProperty({
    description: 'Event types filter',
    type: [String],
  })
  eventTypes: AlertEventType[];

  @ApiProperty({ description: 'Last alert sent timestamp', nullable: true })
  lastSentAt: Date | null;

  @ApiProperty({ description: 'Last error message', nullable: true })
  lastError: string | null;

  @ApiProperty({ description: 'Error count' })
  errorCount: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;
}
