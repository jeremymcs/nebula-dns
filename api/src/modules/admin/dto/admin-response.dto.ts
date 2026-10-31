// Nebula DNS - Admin Response DTOs
// Response types for admin authentication endpoints
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminStatus } from '../entities/admin.entity';
import { AdminRole } from '../enums/admin-role.enum';

/**
 * Admin information in login response
 */
export class AdminInfoDto {
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
    description: 'Admin role for authorization',
    enum: ['super_admin', 'admin', 'viewer'],
    example: 'admin',
  })
  role: AdminRole;
}

/**
 * Admin Login Response DTO
 *
 * Returned on successful admin authentication
 */
export class AdminLoginResponseDto {
  @ApiProperty({
    description: 'JWT access token for admin API calls',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token expiry time in seconds',
    example: 28800,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Authenticated admin information',
    type: AdminInfoDto,
  })
  admin: AdminInfoDto;

  @ApiProperty({
    description:
      'True when the client must complete MFA verification or enrollment before accessing protected admin APIs',
    example: true,
  })
  mfaRequired: boolean;

  @ApiProperty({
    description:
      'True when the admin must scan a QR code and verify TOTP (first-time MFA setup)',
    example: false,
  })
  mfaEnrollmentRequired: boolean;
}

/**
 * Admin Profile Response DTO
 *
 * Returned from GET /admin/me endpoint
 */
export class AdminProfileResponseDto {
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
    description: 'Admin account status',
    enum: ['active', 'suspended', 'pending_mfa'],
    example: 'active',
  })
  status: AdminStatus;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2026-01-17T12:00:00.000Z',
  })
  lastLoginAt: Date | null;

  @ApiProperty({
    description: 'Whether MFA is verified in current session',
    example: true,
  })
  mfaVerified: boolean;

  @ApiProperty({
    description: 'Admin role for authorization',
    enum: ['super_admin', 'admin', 'viewer'],
    example: 'admin',
  })
  role: AdminRole;
}

/**
 * Session revoke response
 */
export class RevokeSessionsResponseDto {
  @ApiProperty({
    description: 'Number of sessions revoked',
    example: 3,
  })
  revokedCount: number;

  @ApiProperty({
    description: 'Success message',
    example: 'Successfully revoked 3 session(s)',
  })
  message: string;
}

/**
 * Generic success message response
 */
export class AdminMessageResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Logged out successfully',
  })
  message: string;
}
