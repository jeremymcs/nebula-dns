// Nebula DNS - MSP Detail DTOs
// DTOs for MSP detail view and client listing endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TenantStatus,
  TenantTier,
} from '../../tenants/entities/tenant.entity';

/**
 * Time period for usage metrics (future use)
 */
export type MetricPeriod = '24h' | '7d' | '30d' | '90d';

/**
 * MSP Detail Query DTO
 *
 * Query parameters for the MSP detail endpoint.
 * Includes optional period for future usage metrics.
 */
export class MspDetailQueryDto {
  @ApiPropertyOptional({
    description: 'Time period for usage metrics',
    enum: ['24h', '7d', '30d', '90d'],
    default: '30d',
  })
  @IsOptional()
  @IsEnum(['24h', '7d', '30d', '90d'], {
    message: 'Period must be one of: 24h, 7d, 30d, 90d',
  })
  period?: MetricPeriod = '30d';
}

/**
 * MSP Detail Response DTO
 *
 * Detailed information about an MSP tenant including
 * aggregated counts across all managed clients.
 */
export class MspDetailResponseDto {
  @ApiProperty({
    description: 'MSP tenant unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'MSP tenant name',
    example: 'Managed IT Solutions',
  })
  name: string;

  @ApiProperty({
    description: 'MSP tenant status',
    enum: ['active', 'suspended', 'cancelled'],
    example: 'active',
  })
  status: TenantStatus;

  @ApiPropertyOptional({
    description: 'MSP contact email address',
    example: 'support@managedit.com',
  })
  contactEmail?: string;

  @ApiProperty({
    description: 'Tenant tier (always msp for this endpoint)',
    example: 'msp',
  })
  tier: 'msp';

  @ApiProperty({
    description: 'Number of client organizations managed by this MSP',
    example: 15,
  })
  clientCount: number;

  @ApiProperty({
    description: 'Total locations across all managed clients',
    example: 42,
  })
  locationCount: number;

  @ApiProperty({
    description: 'Total users across all managed clients',
    example: 128,
  })
  userCount: number;

  @ApiProperty({
    description: 'MSP tenant creation date',
    example: '2024-01-15T09:30:00.000Z',
  })
  createdAt: string;
}

/**
 * MSP Client List Query DTO
 *
 * Query parameters for listing clients under an MSP.
 * Supports search, status filtering, and pagination.
 */
export class MspClientListQueryDto {
  @ApiPropertyOptional({
    description: 'Search by client name (partial, case-insensitive)',
    example: 'acme',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @MaxLength(255, { message: 'Search query must not exceed 255 characters' })
  q?: string;

  @ApiPropertyOptional({
    enum: ['active', 'suspended', 'cancelled'],
    description: 'Filter by client tenant status',
  })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'cancelled'], {
    message: 'Status must be one of: active, suspended, cancelled',
  })
  status?: TenantStatus;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Pagination cursor for fetching next page',
    example: '20',
  })
  @IsOptional()
  @IsString({ message: 'Cursor must be a string' })
  cursor?: string;
}

/**
 * MSP Client DTO
 *
 * Represents a single client organization managed by an MSP.
 */
export class MspClientDto {
  @ApiProperty({
    description: 'Client tenant unique identifier',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Client organization name',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description: 'Client tenant status',
    enum: ['active', 'suspended', 'cancelled'],
    example: 'active',
  })
  status: TenantStatus;

  @ApiProperty({
    description: 'Client tenant tier',
    enum: ['home', 'enterprise', 'msp'],
    example: 'enterprise',
  })
  tier: TenantTier;

  @ApiPropertyOptional({
    description: 'Client contact email address',
    example: 'admin@acmecorp.com',
  })
  contactEmail?: string;

  @ApiProperty({
    description: 'Number of locations for this client',
    example: 5,
  })
  locationCount: number;

  @ApiProperty({
    description: 'Number of users for this client',
    example: 23,
  })
  userCount: number;

  @ApiProperty({
    description: 'Client tenant creation date',
    example: '2024-03-20T14:45:00.000Z',
  })
  createdAt: string;
}

/**
 * MSP Client List Pagination DTO
 *
 * Pagination metadata for client listing results.
 */
export class MspClientListPaginationDto {
  @ApiProperty({
    description: 'Cursor for fetching next page (null if no more results)',
    example: '40',
    nullable: true,
  })
  cursor: string | null;

  @ApiProperty({
    description: 'Whether more results are available',
    example: true,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Total count of matching clients',
    example: 15,
  })
  total: number;
}

/**
 * MSP Client List Response DTO
 *
 * Wraps client listing results with pagination metadata.
 */
export class MspClientListResponseDto {
  @ApiProperty({
    description: 'Array of client organizations',
    type: [MspClientDto],
  })
  data: MspClientDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: MspClientListPaginationDto,
  })
  pagination: MspClientListPaginationDto;
}
