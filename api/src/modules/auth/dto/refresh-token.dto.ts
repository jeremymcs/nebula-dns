// Nebula DNS - Refresh Token DTO
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The refresh token received from the login endpoint',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;
}
