// Nebula DNS - Subscription Plan DTOs
// Data transfer objects for subscription plan limits
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SubscriptionTier } from '../entities/subscription-plan-limit.entity';

export class CreateSubscriptionPlanLimitDto {
  @ApiProperty({
    description: 'Stripe price ID',
    example: 'price_1ABC123xyz',
  })
  @IsString()
  @IsNotEmpty()
  stripePriceId: string;

  @ApiProperty({
    description: 'Plan display name',
    example: 'Home Basic',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Subscription tier',
    enum: ['home', 'enterprise', 'msp'],
  })
  @IsEnum(['home', 'enterprise', 'msp'])
  tier: SubscriptionTier;

  @ApiPropertyOptional({
    description: 'Maximum number of locations (null for unlimited)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  locationLimit?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum number of clients (for MSP tier)',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  clientLimit?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum number of family members (for Home tier)',
    default: 5,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  familyMemberLimit?: number;

  @ApiPropertyOptional({
    description: 'Price per additional location (for usage-based billing)',
    example: 5.99,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerLocation?: number | null;

  @ApiPropertyOptional({
    description: 'Price per additional client (for MSP usage-based billing)',
    example: 15.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerClient?: number | null;

  @ApiProperty({
    description: 'Base monthly price',
    example: 4.99,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice: number;

  @ApiPropertyOptional({
    description: 'Number of trial days',
    default: 14,
    example: 14,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  @Type(() => Number)
  trialDays?: number;
}

export class UpdateSubscriptionPlanLimitDto {
  @ApiPropertyOptional({
    description: 'Plan display name',
    example: 'Home Basic',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of locations (null for unlimited)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  locationLimit?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum number of clients (for MSP tier)',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  clientLimit?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum number of family members (for Home tier)',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  familyMemberLimit?: number;

  @ApiPropertyOptional({
    description: 'Price per additional location',
    example: 5.99,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerLocation?: number | null;

  @ApiPropertyOptional({
    description: 'Price per additional client',
    example: 15.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerClient?: number | null;

  @ApiPropertyOptional({
    description: 'Base monthly price',
    example: 4.99,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Number of trial days',
    example: 14,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  @Type(() => Number)
  trialDays?: number;

  @ApiPropertyOptional({
    description: 'Whether the plan is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SubscriptionPlanLimitResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  stripePriceId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['home', 'enterprise', 'msp'] })
  tier: SubscriptionTier;

  @ApiPropertyOptional()
  locationLimit: number | null;

  @ApiPropertyOptional()
  clientLimit: number | null;

  @ApiProperty()
  familyMemberLimit: number;

  @ApiPropertyOptional()
  pricePerLocation: number | null;

  @ApiPropertyOptional()
  pricePerClient: number | null;

  @ApiProperty()
  basePrice: number;

  @ApiProperty()
  trialDays: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PlanLimitsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by tier',
    enum: ['home', 'enterprise', 'msp'],
  })
  @IsOptional()
  @IsEnum(['home', 'enterprise', 'msp'])
  tier?: SubscriptionTier;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
