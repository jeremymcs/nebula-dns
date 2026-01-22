// Nebula DNS - Admin Activity DTOs
// DTOs for admin activity log endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminActivityAction } from '../entities/admin-activity-log.entity';

/**
 * Admin Activity Query DTO
 *
 * Query parameters for listing admin activity logs with filtering.
 */
export class AdminActivityQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(200, { message: 'Limit must not exceed 200' })
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Pagination cursor for fetching next page',
    example: '50',
  })
  @IsOptional()
  @IsString({ message: 'Cursor must be a string' })
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Filter by admin who performed the action (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Admin ID must be a valid UUID' })
  adminId?: string;

  @ApiPropertyOptional({
    description: 'Filter by admin who was affected by the action (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Target admin ID must be a valid UUID' })
  targetAdminId?: string;

  @ApiPropertyOptional({
    enum: [
      'admin_login',
      'admin_logout',
      'admin_login_failed',
      'admin_invited',
      'admin_created',
      'admin_suspended',
      'admin_reactivated',
      'admin_role_changed',
      'admin_mfa_reset',
      'admin_deleted',
      'admin_password_changed',
      'invite_revoked',
    ],
    description: 'Filter by action type',
  })
  @IsOptional()
  @IsEnum(
    [
      'admin_login',
      'admin_logout',
      'admin_login_failed',
      'admin_invited',
      'admin_created',
      'admin_suspended',
      'admin_reactivated',
      'admin_role_changed',
      'admin_mfa_reset',
      'admin_deleted',
      'admin_password_changed',
      'invite_revoked',
    ],
    {
      message: 'Action must be a valid AdminActivityAction',
    },
  )
  action?: AdminActivityAction;

  @ApiPropertyOptional({
    description: 'Filter activities from this date (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter activities until this date (ISO 8601)',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string;
}

/**
 * Admin Activity Item DTO
 *
 * Represents a single activity entry in the response.
 */
export class AdminActivityItemDto {
  @ApiProperty({
    description: 'Activity log unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Admin ID who performed the action',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  adminId: string;

  @ApiProperty({
    description: 'Email of admin who performed the action',
    example: 'admin@nebula-dns.com',
  })
  adminEmail: string;

  @ApiProperty({
    description: 'Name of admin who performed the action',
    example: 'System Administrator',
  })
  adminName: string;

  @ApiProperty({
    description: 'Type of action performed',
    enum: [
      'admin_login',
      'admin_logout',
      'admin_login_failed',
      'admin_invited',
      'admin_created',
      'admin_suspended',
      'admin_reactivated',
      'admin_role_changed',
      'admin_mfa_reset',
      'admin_deleted',
      'admin_password_changed',
      'invite_revoked',
    ],
    example: 'admin_login',
  })
  action: AdminActivityAction;

  @ApiProperty({
    description: 'Admin ID who was affected by the action',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  targetAdminId: string | null;

  @ApiProperty({
    description: 'Email of admin who was affected by the action',
    example: 'target@nebula-dns.com',
    nullable: true,
  })
  targetAdminEmail: string | null;

  @ApiProperty({
    description: 'Additional context about the action',
    example: { previousRole: 'admin', newRole: 'super_admin' },
    nullable: true,
  })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'IP address from which the action was performed',
    example: '192.168.1.100',
    nullable: true,
  })
  ipAddress: string | null;

  @ApiProperty({
    description: 'Timestamp when the action occurred',
    example: '2026-01-21T12:00:00.000Z',
  })
  createdAt: string;
}

/**
 * Admin Activity Pagination Info DTO
 *
 * Pagination metadata for activity log results.
 */
export class AdminActivityPaginationDto {
  @ApiProperty({
    description: 'Cursor for fetching next page (null if no more results)',
    example: '100',
    nullable: true,
  })
  cursor: string | null;

  @ApiProperty({
    description: 'Whether more results are available',
    example: true,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Total count of activity logs',
    example: 1523,
  })
  total: number;
}

/**
 * Admin Activity Response DTO
 *
 * Wraps activity log results with pagination metadata.
 */
export class AdminActivityResponseDto {
  @ApiProperty({
    description: 'Array of admin activity logs',
    type: [AdminActivityItemDto],
  })
  data: AdminActivityItemDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: AdminActivityPaginationDto,
  })
  pagination: AdminActivityPaginationDto;
}
