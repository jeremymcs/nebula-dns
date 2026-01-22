// Nebula DNS - Admin User Management DTOs
// DTOs for admin user listing and management endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '../enums/admin-role.enum';
import { AdminStatus } from '../entities/admin.entity';

/**
 * List Admins Query DTO
 *
 * Query parameters for listing admin users with pagination,
 * role, and status filtering.
 */
export class ListAdminsQueryDto {
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

  @ApiPropertyOptional({
    enum: ['super_admin', 'admin', 'viewer'],
    description: 'Filter by admin role',
  })
  @IsOptional()
  @IsEnum(AdminRole, {
    message: 'Role must be one of: super_admin, admin, viewer',
  })
  role?: AdminRole;

  @ApiPropertyOptional({
    enum: ['active', 'suspended', 'pending_mfa'],
    description: 'Filter by admin status',
  })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'pending_mfa'], {
    message: 'Status must be one of: active, suspended, pending_mfa',
  })
  status?: AdminStatus;
}

/**
 * Admin List Item DTO
 *
 * Represents a single admin in the listing response.
 */
export class AdminListItemDto {
  @ApiProperty({
    description: 'Admin unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@nebula-dns.com',
  })
  email: string;

  @ApiProperty({
    description: 'Admin display name',
    example: 'System Administrator',
  })
  name: string;

  @ApiProperty({
    description: 'Admin role for authorization',
    enum: ['super_admin', 'admin', 'viewer'],
    example: 'admin',
  })
  role: AdminRole;

  @ApiProperty({
    description: 'Admin account status',
    enum: ['active', 'suspended', 'pending_mfa'],
    example: 'active',
  })
  status: AdminStatus;

  @ApiProperty({
    description: 'Whether MFA setup is complete',
    example: true,
  })
  mfaSetupComplete: boolean;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2026-01-17T12:00:00.000Z',
    nullable: true,
  })
  lastLoginAt: string | null;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
  createdAt: string;
}

/**
 * List Admins Pagination Info DTO
 *
 * Pagination metadata for admin listing results.
 */
export class ListAdminsPaginationDto {
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
    description: 'Total count of admins',
    example: 42,
  })
  total: number;
}

/**
 * List Admins Response DTO
 *
 * Wraps admin listing results with pagination metadata.
 */
export class ListAdminsResponseDto {
  @ApiProperty({
    description: 'Array of admin users',
    type: [AdminListItemDto],
  })
  data: AdminListItemDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: ListAdminsPaginationDto,
  })
  pagination: ListAdminsPaginationDto;
}

/**
 * Admin Detail DTO
 *
 * Full admin profile with invitation details.
 */
export class AdminDetailDto extends AdminListItemDto {
  @ApiProperty({
    description: 'ID of admin who invited this admin',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  invitedByAdminId: string | null;

  @ApiProperty({
    description: 'Email of admin who invited this admin',
    example: 'super@nebula-dns.com',
    nullable: true,
  })
  invitedByAdminEmail: string | null;
}

/**
 * Suspend Admin DTO
 *
 * Optional reason for suspending an admin.
 */
export class SuspendAdminDto {
  @ApiPropertyOptional({
    description: 'Reason for suspension',
    example: 'Violation of security policy',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}

/**
 * Update Admin Role DTO
 *
 * Change admin role assignment.
 */
export class UpdateAdminRoleDto {
  @ApiProperty({
    description: 'New role to assign',
    enum: ['super_admin', 'admin', 'viewer'],
    example: 'admin',
  })
  @IsEnum(AdminRole, {
    message: 'Role must be one of: super_admin, admin, viewer',
  })
  role: AdminRole;
}

/**
 * Admin Message Response DTO
 *
 * Generic success message response.
 */
export class AdminMessageResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Admin suspended successfully',
  })
  message: string;
}
