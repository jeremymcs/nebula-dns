// Nebula DNS - MSP Onboarding DTOs
// DTOs for admin MSP tenant creation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  MinLength,
  MaxLength,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Create MSP Tenant DTO
 *
 * Request body for creating a new MSP tenant with initial admin user.
 * Used by admin onboarding endpoint POST /admin/msp/tenants.
 */
export class CreateMspTenantDto {
  @ApiProperty({
    description: 'MSP organization name',
    example: 'Acme Managed Services',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description:
      'URL-friendly slug (auto-generated from name if not provided)',
    example: 'acme-managed-services',
    minLength: 2,
    maxLength: 100,
    pattern: '^[a-z0-9-]+$',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Slug must be at least 2 characters' })
  @MaxLength(100, { message: 'Slug must not exceed 100 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiProperty({
    description: 'Email address for the initial admin user',
    example: 'admin@acme-msp.com',
  })
  @IsEmail({}, { message: 'Admin email must be a valid email address' })
  adminEmail: string;

  @ApiPropertyOptional({
    description: 'Display name for the initial admin user',
    example: 'John Smith',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Admin name must be at least 2 characters' })
  @MaxLength(255, { message: 'Admin name must not exceed 255 characters' })
  adminName?: string;

  @ApiPropertyOptional({
    description: 'MSP contact email (defaults to adminEmail if not provided)',
    example: 'support@acme-msp.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Contact email must be a valid email address' })
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'MSP contact phone number',
    example: '+1-555-123-4567',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Contact phone must not exceed 50 characters' })
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of locations (null = unlimited)',
    example: 100,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Location limit must be an integer' })
  @Min(1, { message: 'Location limit must be at least 1' })
  @Max(10000, { message: 'Location limit must not exceed 10000' })
  locationLimit?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of managed clients (null = unlimited)',
    example: 50,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Client limit must be an integer' })
  @Min(1, { message: 'Client limit must be at least 1' })
  @Max(10000, { message: 'Client limit must not exceed 10000' })
  clientLimit?: number;
}

/**
 * MSP Tenant Created Response DTO
 *
 * Response after successfully creating an MSP tenant.
 * Includes created tenant details and initial admin user info.
 */
export class MspTenantCreatedResponseDto {
  @ApiProperty({
    description: 'Created tenant unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'MSP organization name',
    example: 'Acme Managed Services',
  })
  name: string;

  @ApiProperty({
    description: 'Unique URL-friendly slug',
    example: 'acme-managed-services',
  })
  slug: string;

  @ApiProperty({
    description: 'Tenant status (always active on creation)',
    example: 'active',
  })
  status: 'active';

  @ApiProperty({
    description: 'Tenant tier (always msp for MSP onboarding)',
    example: 'msp',
  })
  tier: 'msp';

  @ApiProperty({
    description: 'Created admin user unique identifier',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  adminUserId: string;

  @ApiProperty({
    description: 'Admin user email address',
    example: 'admin@acme-msp.com',
  })
  adminEmail: string;

  @ApiProperty({
    description: 'Whether welcome email was dispatched to admin',
    example: false,
  })
  welcomeEmailSent: boolean;

  @ApiProperty({
    description: 'Location limit (null = unlimited)',
    example: 100,
    nullable: true,
  })
  locationLimit: number | null;

  @ApiProperty({
    description: 'Client limit (null = unlimited)',
    example: 50,
    nullable: true,
  })
  clientLimit: number | null;

  @ApiProperty({
    description: 'Timestamp when tenant was created',
    example: '2026-01-18T12:00:00.000Z',
  })
  createdAt: string;
}
