// Nebula DNS - MSP Listing DTOs
// DTOs for admin MSP listing functionality
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '../../tenants/entities/tenant.entity';

/**
 * MSP Listing Query DTO
 *
 * Query parameters for listing MSP tenants with pagination.
 */
export class MspListingQueryDto {
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
 * MSP Tenant DTO
 *
 * Represents a single MSP tenant in the listing response.
 */
export class MspTenantDto {
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

  @ApiProperty({
    description: 'Number of client organizations managed by this MSP',
    example: 15,
  })
  clientCount: number;

  @ApiPropertyOptional({
    description: 'MSP contact email',
    example: 'support@managedit.com',
  })
  contactEmail?: string;
}

/**
 * MSP Listing Pagination Info DTO
 *
 * Pagination metadata for MSP listing results.
 */
export class MspListingPaginationDto {
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
    description: 'Total count of MSP tenants',
    example: 42,
  })
  total: number;
}

/**
 * MSP Listing Response DTO
 *
 * Wraps MSP listing results with pagination metadata.
 */
export class MspListingResponseDto {
  @ApiProperty({
    description: 'Array of MSP tenants',
    type: [MspTenantDto],
  })
  data: MspTenantDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: MspListingPaginationDto,
  })
  pagination: MspListingPaginationDto;
}
