// Nebula DNS - Admin Invitation DTOs
// DTOs for admin invitation flow endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '../enums/admin-role.enum';

export type AdminInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'revoked';

/**
 * Create Admin Invitation DTO
 *
 * Request DTO for creating a new admin invitation.
 */
export class CreateAdminInvitationDto {
  @ApiProperty({
    description: 'Email address of the admin to invite',
    example: 'newadmin@nebula-dns.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Role to assign to the new admin',
    enum: ['super_admin', 'admin', 'viewer'],
    example: 'admin',
  })
  @IsEnum(AdminRole, {
    message: 'Role must be one of: super_admin, admin, viewer',
  })
  role: AdminRole;
}

/**
 * Accept Admin Invitation DTO
 *
 * Request DTO for accepting an admin invitation and setting up account.
 */
export class AcceptAdminInvitationDto {
  @ApiProperty({
    description: 'Invitation token from email link',
    example: '1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  @IsString({ message: 'Token must be a string' })
  token: string;

  @ApiProperty({
    description: 'Display name for the admin',
    example: 'John Doe',
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    description:
      'Password for the admin account (14+ chars, mixed case, numbers, symbols)',
    example: 'SecureP@ssw0rd123!',
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(14, { message: 'Password must be at least 14 characters' })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[0-9]/, {
    message: 'Password must contain at least one number',
  })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain at least one special character',
  })
  password: string;
}

/**
 * Admin Invitation Response DTO
 *
 * Response DTO for invitation details.
 */
export class AdminInvitationResponseDto {
  @ApiProperty({
    description: 'Invitation unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Email address of the invited admin',
    example: 'newadmin@nebula-dns.com',
  })
  email: string;

  @ApiProperty({
    description: 'Role assigned to the invited admin',
    enum: ['super_admin', 'admin', 'viewer'],
    example: 'admin',
  })
  role: AdminRole;

  @ApiProperty({
    description: 'Invitation status',
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    example: 'pending',
  })
  status: AdminInvitationStatus;

  @ApiProperty({
    description: 'Invitation expiry timestamp',
    example: '2026-01-28T12:00:00.000Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Email of admin who created the invitation',
    example: 'super@nebula-dns.com',
  })
  invitedByAdminEmail: string;

  @ApiProperty({
    description: 'Invitation creation timestamp',
    example: '2026-01-21T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Whether invitation is expired',
    example: false,
  })
  isExpired: boolean;
}

/**
 * Create Admin Invitation Response DTO
 *
 * Response DTO for created invitation with email status.
 */
export class CreateAdminInvitationResponseDto {
  @ApiProperty({
    description: 'Created invitation details',
    type: AdminInvitationResponseDto,
  })
  invitation: AdminInvitationResponseDto;

  @ApiProperty({
    description: 'Whether invitation email was successfully sent',
    example: true,
  })
  emailSent: boolean;

  @ApiPropertyOptional({
    description:
      'Invite accept URL when email was not sent (copy-link fallback for operators)',
  })
  inviteUrl?: string;
}

/**
 * List Invitations Query DTO
 *
 * Query parameters for listing admin invitations.
 */
export class ListInvitationsQueryDto {
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
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    description: 'Filter by invitation status',
  })
  @IsOptional()
  @IsEnum(['pending', 'accepted', 'expired', 'revoked'], {
    message: 'Status must be one of: pending, accepted, expired, revoked',
  })
  status?: AdminInvitationStatus;
}

/**
 * List Invitations Pagination Info DTO
 *
 * Pagination metadata for invitation listing results.
 */
export class ListInvitationsPaginationDto {
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
    description: 'Total count of invitations',
    example: 5,
  })
  total: number;
}

/**
 * List Invitations Response DTO
 *
 * Wraps invitation listing results with pagination metadata.
 */
export class ListInvitationsResponseDto {
  @ApiProperty({
    description: 'Array of admin invitations',
    type: [AdminInvitationResponseDto],
  })
  data: AdminInvitationResponseDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: ListInvitationsPaginationDto,
  })
  pagination: ListInvitationsPaginationDto;
}
