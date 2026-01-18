// Nebula DNS - Admin Impersonation DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty } from '@nestjs/swagger';

/**
 * Tenant tier enum for impersonation response
 */
export type TenantTier = 'home' | 'enterprise' | 'msp';

/**
 * Response DTO for starting an impersonation session
 * Contains the tenant-scoped JWT token and tenant information
 */
export class StartImpersonationResponseDto {
  @ApiProperty({
    description: 'JWT token scoped to the target tenant with full admin access',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidGVuYW50SWQiOiJhYmMtMTIzIn0.xyz',
  })
  accessToken: string;

  @ApiProperty({
    description: 'UUID of the target tenant being impersonated',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Display name of the target tenant',
    example: 'Acme Corporation',
  })
  tenantName: string;

  @ApiProperty({
    description: 'Subscription tier of the target tenant',
    enum: ['home', 'enterprise', 'msp'],
    example: 'enterprise',
  })
  tenantTier: TenantTier;

  @ApiProperty({
    description: 'Token expiration time in seconds (1 hour for impersonation)',
    example: 3600,
  })
  expiresIn: number;
}

/**
 * Response DTO for ending an impersonation session
 * Confirms session termination and provides duration statistics
 */
export class EndImpersonationResponseDto {
  @ApiProperty({
    description: 'Confirmation message that the impersonation session has ended',
    example: 'Impersonation session ended',
  })
  message: string;

  @ApiProperty({
    description: 'Duration of the impersonation session in seconds',
    example: 1234,
  })
  durationSeconds: number;
}
