// Nebula DNS - Alert Event DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AlertSeverity,
  AlertEventType,
  AlertEvent,
} from '../interfaces/alert-provider.interface';

/**
 * Alert event DTO - internal event representation
 */
export class AlertEventDto implements AlertEvent {
  @ApiProperty({ description: 'Alert event ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Alert event type',
    enum: ['system_health', 'billing', 'security'],
  })
  @IsEnum(['system_health', 'billing', 'security'])
  type: AlertEventType;

  @ApiProperty({
    description: 'Alert severity',
    enum: ['critical', 'error', 'warning', 'info'],
  })
  @IsEnum(['critical', 'error', 'warning', 'info'])
  severity: AlertSeverity;

  @ApiProperty({ description: 'Alert title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Alert message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Alert source (e.g., policy-svc, stripe, auth)' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ description: 'Alert timestamp' })
  @IsDateString()
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Deduplication key for PagerDuty',
  })
  @IsOptional()
  @IsString()
  dedupKey?: string;
}

/**
 * Create alert event DTO - for manually triggering alerts (admin use)
 */
export class CreateAlertEventDto {
  @ApiProperty({
    description: 'Alert event type',
    enum: ['system_health', 'billing', 'security'],
  })
  @IsEnum(['system_health', 'billing', 'security'])
  type: AlertEventType;

  @ApiProperty({
    description: 'Alert severity',
    enum: ['critical', 'error', 'warning', 'info'],
  })
  @IsEnum(['critical', 'error', 'warning', 'info'])
  severity: AlertSeverity;

  @ApiProperty({
    description: 'Alert title',
    example: 'Policy Service Down',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Alert message',
    example: 'Policy service is not responding to health checks',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Alert source',
    example: 'policy-svc',
  })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Deduplication key for PagerDuty',
  })
  @IsOptional()
  @IsString()
  dedupKey?: string;
}
