/**
 * Nebula DNS - MSP Template Version DTOs
 * Data Transfer Objects for template versioning operations (US-034, US-035, US-036)
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsInt,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MspTemplateConfig } from '../entities/msp-template.entity';

// ============================================
// Template Version DTOs
// ============================================

export class TemplateVersionResponseDto {
  @ApiProperty({ description: 'Version record ID' })
  id: string;

  @ApiProperty({ description: 'Template ID' })
  templateId: string;

  @ApiProperty({ description: 'Version number' })
  version: number;

  @ApiProperty({ description: 'Policy configuration snapshot' })
  config: MspTemplateConfig;

  @ApiPropertyOptional({ description: 'User ID who created this version' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'User name who created this version' })
  createdByName?: string;

  @ApiPropertyOptional({ description: 'Changelog/notes for this version' })
  changelog?: string;

  @ApiProperty({
    description: 'Whether this version was created from a rollback',
  })
  isRollback: boolean;

  @ApiPropertyOptional({
    description: 'If rollback, the source version number',
  })
  rollbackFromVersion?: number;

  @ApiProperty({ description: 'When this version was created' })
  createdAt: Date;
}

export class TemplateVersionListResponseDto {
  @ApiProperty({ type: [TemplateVersionResponseDto] })
  versions: TemplateVersionResponseDto[];

  @ApiProperty({ description: 'Current active version number' })
  currentVersion: number;

  @ApiProperty({ description: 'Total number of versions' })
  totalVersions: number;
}

// ============================================
// Rollback DTOs
// ============================================

export class RollbackTemplateDto {
  @ApiPropertyOptional({
    description:
      'Whether to re-apply the template to all clients after rollback',
    default: false,
  })
  @IsOptional()
  reapplyToClients?: boolean;
}

export class RollbackResponseDto {
  @ApiProperty({ description: 'Indicates if rollback was successful' })
  success: boolean;

  @ApiProperty({ description: 'The new version number after rollback' })
  newVersion: number;

  @ApiProperty({ description: 'The version that was rolled back to' })
  rolledBackToVersion: number;

  @ApiPropertyOptional({ description: 'Message about the rollback operation' })
  message?: string;

  @ApiPropertyOptional({ description: 'Job ID if re-applying to clients' })
  applyJobId?: string;
}

// ============================================
// Client Application DTOs
// ============================================

export class ApplyTemplateToClientsDto {
  @ApiProperty({
    description:
      'Client IDs to apply template to, or "all" to apply to all clients',
    oneOf: [
      { type: 'array', items: { type: 'string', format: 'uuid' } },
      { type: 'string', enum: ['all'] },
    ],
  })
  @IsOptional()
  clientIds?: string[] | 'all';
}

export class ApplyJobResponseDto {
  @ApiProperty({ description: 'Unique job ID for tracking progress' })
  jobId: string;

  @ApiProperty({ description: 'Current status of the job' })
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

  @ApiProperty({ description: 'Total number of clients to apply to' })
  totalClients: number;

  @ApiProperty({ description: 'Number of clients processed so far' })
  processedClients: number;

  @ApiProperty({ description: 'Number of successful applications' })
  successCount: number;

  @ApiProperty({ description: 'Number of failed applications' })
  failedCount: number;

  @ApiPropertyOptional({
    description: 'Detailed results per client',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        clientId: { type: 'string' },
        clientName: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'success', 'failed'] },
        error: { type: 'string' },
        policyId: { type: 'string' },
      },
    },
  })
  results?: Array<{
    clientId: string;
    clientName: string;
    status: 'pending' | 'success' | 'failed';
    error?: string;
    policyId?: string;
  }>;

  @ApiPropertyOptional({ description: 'When the job started' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'When the job completed' })
  completedAt?: Date;
}

export class ClientUsingTemplateDto {
  @ApiProperty({ description: 'Client tenant ID' })
  clientId: string;

  @ApiProperty({ description: 'Client name' })
  clientName: string;

  @ApiProperty({ description: 'Client slug' })
  clientSlug: string;

  @ApiProperty({ description: 'Template version currently applied' })
  appliedVersion: number;

  @ApiProperty({ description: 'Whether client is on the latest version' })
  isLatestVersion: boolean;

  @ApiProperty({ description: 'Application status' })
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  @ApiPropertyOptional({ description: 'Policy ID created from template' })
  policyId?: string;

  @ApiProperty({ description: 'When the template was last applied' })
  appliedAt: Date;
}

export class ClientsUsingTemplateResponseDto {
  @ApiProperty({ type: [ClientUsingTemplateDto] })
  clients: ClientUsingTemplateDto[];

  @ApiProperty({ description: 'Total number of clients using this template' })
  totalClients: number;

  @ApiProperty({ description: 'Number of clients on the latest version' })
  clientsOnLatest: number;

  @ApiProperty({ description: 'Number of clients on older versions' })
  clientsOutdated: number;
}

// ============================================
// Config Diff DTOs
// ============================================

export class ConfigDiffResponseDto {
  @ApiProperty({ description: 'Template ID' })
  templateId: string;

  @ApiProperty({ description: 'Version being compared (older)' })
  fromVersion: number;

  @ApiProperty({ description: 'Version being compared to (newer/current)' })
  toVersion: number;

  @ApiProperty({
    description: 'Structured diff of the configuration',
    type: 'object',
    additionalProperties: true,
  })
  diff: {
    added: Record<string, any>;
    removed: Record<string, any>;
    changed: Record<string, { from: any; to: any }>;
  };

  @ApiProperty({ description: 'Summary of changes' })
  summary: string;
}

// ============================================
// Retry Application DTO
// ============================================

export class RetryApplicationDto {
  @ApiProperty({
    description: 'Client IDs to retry application for',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  clientIds: string[];
}
