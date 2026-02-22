// Nebula DNS - MSP Client DTOs
// Data transfer objects for MSP client management (US-006)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsUUID,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MspClientStatus } from '../entities/msp-client.entity';
import { TenantPlan } from '../../tenants/entities/tenant.entity';

/**
 * DTO for creating a new client organization under an MSP
 * This creates both the client tenant and the MSP-client relationship
 */
export class CreateMspClientDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Name of the client organization',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'A brief description of the client organization',
    description: 'Optional description of the client',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: 'admin@acme.com',
    description:
      'Email address for the initial admin user of the client organization',
  })
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'Optional template ID to apply default policies to the new client',
  })
  @IsOptional()
  @IsUUID('4')
  applyTemplateId?: string;

  @ApiPropertyOptional({
    example: 'acme-corp',
    description: 'URL-friendly slug for the client organization',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({
    enum: ['free', 'starter', 'pro', 'enterprise'],
    example: 'enterprise',
    description: 'Subscription plan for the client',
  })
  @IsOptional()
  @IsEnum(['free', 'starter', 'pro', 'enterprise'])
  plan?: TenantPlan;

  @ApiPropertyOptional({
    example: '+1-555-555-5555',
    description: 'Contact phone number for the client',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({
    example: '123 Main St, Suite 100, New York, NY 10001',
    description: 'Physical address of the client organization',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Healthcare',
    description: 'Industry vertical of the client',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    example: '50-200',
    description: 'Company size range',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companySize?: string;
}

/**
 * DTO for updating an MSP-client relationship or client details
 * Per US-006, only name and status can be updated via this endpoint
 */
export class UpdateMspClientDto {
  @ApiPropertyOptional({
    example: 'Acme Corporation Inc.',
    description: 'Updated name of the client organization',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    enum: ['active', 'suspended'],
    example: 'active',
    description: 'Status of the client relationship',
  })
  @IsOptional()
  @IsEnum(['active', 'suspended'])
  status?: MspClientStatus;
}

/**
 * DTO for linking an existing tenant to an MSP
 */
export class LinkMspClientDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the tenant to link as a client',
  })
  @IsUUID()
  clientTenantId: string;
}

/**
 * DTO for removing an MSP-client relationship
 */
export class RemoveMspClientDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'If true, permanently deletes the client tenant. If false, only removes the MSP relationship.',
  })
  @IsOptional()
  @IsBoolean()
  deleteClient?: boolean;
}

/**
 * Response DTO for MSP client information (US-006 spec)
 */
export class MspClientResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier of the client organization',
  })
  id: string;

  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Name of the client organization',
  })
  name: string;

  @ApiProperty({
    enum: ['active', 'suspended'],
    example: 'active',
    description: 'Status of the client relationship',
  })
  status: MspClientStatus;

  @ApiProperty({
    example: 5,
    description: 'Number of locations configured for this client',
  })
  locationCount: number;

  @ApiProperty({
    example: 3,
    description: 'Number of users in the client organization',
  })
  userCount: number;

  @ApiProperty({
    example: '2026-01-15T10:30:00.000Z',
    description: 'ISO timestamp when the client was created',
  })
  createdAt: string;

  @ApiPropertyOptional({
    example: 'acme-corp',
    description: 'URL-friendly slug for the client organization',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Number of policies configured for this client',
  })
  policyCount?: number;

  @ApiPropertyOptional({
    example: 'admin@acme.com',
    description: 'Primary contact email for the client',
  })
  contactEmail?: string;

  @ApiPropertyOptional({
    example: 'A brief description of the client organization',
    description: 'Description of the client organization',
  })
  description?: string;
}

/**
 * Response DTO for paginated list of MSP clients
 */
export class MspClientListResponseDto {
  @ApiProperty({
    type: [MspClientResponseDto],
    description: 'List of client organizations',
  })
  clients: MspClientResponseDto[];

  @ApiProperty({
    example: 10,
    description: 'Total number of clients',
  })
  total: number;

  @ApiProperty({
    example: 25,
    description: 'Maximum number of clients allowed by plan (null = unlimited)',
    nullable: true,
  })
  limit: number | null;

  @ApiProperty({
    example: 15,
    description: 'Number of remaining client slots (null = unlimited)',
    nullable: true,
  })
  remaining: number | null;
}

/**
 * Query parameters for listing MSP clients
 */
export class MspClientQueryDto {
  @ApiPropertyOptional({
    enum: ['active', 'suspended'],
    description: 'Filter by client status',
  })
  @IsOptional()
  @IsEnum(['active', 'suspended'])
  status?: MspClientStatus;

  @ApiPropertyOptional({
    example: 'acme',
    description: 'Search clients by name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (1-indexed)',
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of items per page',
  })
  @IsOptional()
  limit?: number;
}
