/**
 * Onboarding DTOs
 */

import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOnboardingDto {
  @ApiPropertyOptional({ description: 'Current step ID' })
  @IsString()
  @IsOptional()
  currentStep?: string;

  @ApiPropertyOptional({ description: 'Step ID to mark as completed' })
  @IsString()
  @IsOptional()
  completeStep?: string;
}

export class CompleteOnboardingDto {
  @ApiPropertyOptional({ description: 'Whether onboarding was skipped' })
  @IsBoolean()
  @IsOptional()
  skipped?: boolean;
}
