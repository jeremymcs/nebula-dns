// Nebula DNS - Trial DTOs
// Data transfer objects for tier upgrade trials (US-032, US-033)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantTier } from '../../tenants/entities/tenant.entity';
import { TrialStatus } from '../entities/trial-history.entity';

export class StartTrialDto {
  @ApiProperty({
    description: 'The tier to trial',
    enum: ['home', 'enterprise', 'msp'],
    example: 'enterprise',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['home', 'enterprise', 'msp'])
  tier: TenantTier;

  @ApiPropertyOptional({
    description: 'Billing cycle preference if converted',
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  })
  @IsString()
  @IsIn(['monthly', 'yearly'])
  @IsOptional()
  billingCycle?: 'monthly' | 'yearly' = 'monthly';
}

export class ConvertTrialDto {
  @ApiPropertyOptional({
    description: 'Billing cycle for the paid subscription',
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  })
  @IsString()
  @IsIn(['monthly', 'yearly'])
  @IsOptional()
  billingCycle?: 'monthly' | 'yearly' = 'monthly';
}

export class TrialStatusResponseDto {
  @ApiProperty({ description: 'Whether tenant has an active trial' })
  hasActiveTrial: boolean;

  @ApiPropertyOptional({ description: 'Current trial tier if active' })
  trialTier?: TenantTier;

  @ApiPropertyOptional({ description: 'Original tier before trial' })
  originalTier?: TenantTier;

  @ApiPropertyOptional({ description: 'Trial start date' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Trial end date' })
  endsAt?: Date;

  @ApiPropertyOptional({ description: 'Days remaining in trial' })
  daysRemaining?: number;

  @ApiPropertyOptional({ description: 'Trial status' })
  status?: TrialStatus;

  @ApiPropertyOptional({
    description: 'Available tiers for trial (not previously trialed)',
  })
  availableTrials?: TenantTier[];
}

export class TrialHistoryItemDto {
  @ApiProperty({ description: 'Trial history record ID' })
  id: string;

  @ApiProperty({ description: 'Tier that was trialed' })
  trialTier: TenantTier;

  @ApiProperty({ description: 'Original tier before trial' })
  originalTier: TenantTier;

  @ApiProperty({ description: 'Trial start date' })
  startedAt: Date;

  @ApiProperty({ description: 'Trial end date' })
  endsAt: Date;

  @ApiProperty({ description: 'Trial status' })
  status: TrialStatus;

  @ApiPropertyOptional({ description: 'When trial ended' })
  endedAt?: Date | null;

  @ApiPropertyOptional({ description: 'When trial was converted to paid' })
  convertedAt?: Date | null;
}

export class ConvertTrialResponseDto {
  @ApiProperty({ description: 'Whether conversion was successful' })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Stripe checkout session URL for payment',
  })
  checkoutUrl?: string;

  @ApiPropertyOptional({ description: 'Stripe checkout session ID' })
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Message about the conversion' })
  message?: string;
}

export class StartTrialResponseDto {
  @ApiProperty({ description: 'Whether trial was started successfully' })
  success: boolean;

  @ApiProperty({ description: 'The tier being trialed' })
  trialTier: TenantTier;

  @ApiProperty({ description: 'Trial end date' })
  endsAt: Date;

  @ApiProperty({ description: 'Days in the trial period' })
  trialDays: number;

  @ApiPropertyOptional({ description: 'Message about the trial' })
  message?: string;
}
