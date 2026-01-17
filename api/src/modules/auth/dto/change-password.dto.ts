// Nebula DNS - Change Password DTO
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Your current password for verification',
    example: 'CurrentP@ssw0rd!',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description:
      'New password must be at least 12 characters with uppercase, lowercase, number, and special character',
    example: 'NewSecureP@ssw0rd!',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}
