// Nebula DNS - Usage Report DTOs for Stripe Metered Billing
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export enum UsageType {
  LOCATION = 'location',
  CLIENT = 'client',
}

export class UsageRecordDto {
  @IsString()
  tenantId: string;

  @IsEnum(UsageType)
  type: UsageType;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  subscriptionItemId?: string;
}

export class UsageSummaryResponseDto {
  tenantId: string;
  type: UsageType;
  currentQuantity: number;
  periodStart: Date;
  periodEnd: Date;
  totalReported: number;
}

export class GetUsageSummaryDto {
  @IsString()
  tenantId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(UsageType)
  type?: UsageType;
}

export class MonthlyUsageResponseDto {
  tenantId: string;
  month: string;
  locationCount: number;
  clientCount: number;
  locationUsageReported: number;
  clientUsageReported: number;
}

export class UsageReportResultDto {
  success: boolean;
  usageRecordId?: string;
  quantity: number;
  timestamp: Date;
  error?: string;
}
