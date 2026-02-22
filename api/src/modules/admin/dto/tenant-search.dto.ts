// Nebula DNS - Tenant Search DTOs
// DTOs for admin tenant search functionality
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus, TenantTier } from '../../tenants/entities/tenant.entity';

/**
 * Tenant Search Query DTO
 *
 * Validates search input for finding tenants by:
 * - Partial name match (case-insensitive)
 * - Exact tenant ID (UUID)
 * - User email address
 */
export class TenantSearchQueryDto {
  @ApiProperty({
    description:
      'Search query - can be tenant name (partial), tenant ID (UUID), or user email',
    example: 'acme',
    minLength: 2,
    maxLength: 255,
  })
  @IsString({ message: 'Search query must be a string' })
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @MaxLength(255, { message: 'Search query must not exceed 255 characters' })
  q: string;

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
 * Tenant Search Result DTO
 *
 * Represents a single tenant in search results with minimal fields.
 */
export class TenantSearchResultDto {
  @ApiProperty({
    description: 'Tenant unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description: 'Tenant status',
    enum: ['active', 'suspended', 'cancelled'],
    example: 'active',
  })
  status: TenantStatus;

  @ApiProperty({
    description: 'Tenant tier',
    enum: ['home', 'enterprise', 'msp'],
    example: 'enterprise',
  })
  tier: TenantTier;

  @ApiPropertyOptional({
    description: 'Matched user email (only present when search was by email)',
    example: 'admin@acme.com',
  })
  matchedEmail?: string;
}

/**
 * Pagination Info DTO
 *
 * Pagination metadata for search results.
 */
export class PaginationInfoDto {
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
    description: 'Total count of matching tenants',
    example: 42,
  })
  total: number;
}

/**
 * Tenant Search Response DTO
 *
 * Wraps search results with pagination metadata.
 */
export class TenantSearchResponseDto {
  @ApiProperty({
    description: 'Array of matching tenants',
    type: [TenantSearchResultDto],
  })
  data: TenantSearchResultDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationInfoDto,
  })
  pagination: PaginationInfoDto;
}
