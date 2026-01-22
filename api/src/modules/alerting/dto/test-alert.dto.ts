// Nebula DNS - Test Alert DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/**
 * Test alert request DTO
 */
export class TestAlertRequestDto {
  @ApiPropertyOptional({
    description: 'Provider type to test (optional, defaults to test all)',
    enum: ['slack', 'pagerduty'],
  })
  @IsOptional()
  @IsString()
  providerType?: string;
}

/**
 * Test alert response DTO
 */
export class TestAlertResponseDto {
  @ApiProperty({ description: 'Whether the test was successful' })
  success: boolean;

  @ApiProperty({ description: 'Test result message' })
  message: string;

  @ApiPropertyOptional({ description: 'Response time in milliseconds' })
  responseTimeMs?: number;
}
