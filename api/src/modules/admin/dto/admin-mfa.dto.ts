// Flux Shield - Admin MFA DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';
import { AdminLoginResponseDto } from './admin-response.dto';

export class AdminMfaCodeDto {
  @ApiProperty({
    description: '6-digit TOTP code or backup code',
    example: '123456',
  })
  @IsString()
  @Length(6, 16)
  code: string;
}

export class AdminMfaEnrollStartResponseDto {
  @ApiProperty({ description: 'Base32 TOTP secret (for manual entry)' })
  secret: string;

  @ApiProperty({ description: 'otpauth:// URL for QR code generation' })
  qrCodeUrl: string;

  @ApiPropertyOptional({
    description: 'One-time backup codes (shown only during enrollment)',
    type: [String],
  })
  backupCodes?: string[];
}

export class AdminMfaVerifyResponseDto extends AdminLoginResponseDto {}
