// Nebula DNS - Admin Login DTO
// Stricter validation for admin authentication
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsStrongPassword,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Admin Login DTO
 *
 * Validates admin login credentials with stricter password requirements
 * than tenant users (14+ characters vs 8+ for tenants).
 */
export class AdminLoginDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@nebula-dns.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description:
      'Admin password (14+ characters with mixed case, numbers, and symbols)',
    example: 'AdminSecureP@ssw0rd123!',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword(
    {
      minLength: 14,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 14 characters with uppercase, lowercase, number, and symbol',
    },
  )
  password: string;
}
