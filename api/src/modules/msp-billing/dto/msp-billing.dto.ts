import { IsString, IsNumber, IsOptional, IsUUID, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Query Bundle DTOs
export class CreateQueryBundleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1000)
  queryCount: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateQueryBundleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  queryCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// Purchase DTOs
export class PurchaseBundleDto {
  @IsUUID()
  bundleId: string;
}

export class CreateCustomPurchaseDto {
  @IsNumber()
  @Min(100000)
  queryCount: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

// Subscription Settings DTOs
export class UpdateSubscriptionSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  overageRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  alertThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  autoPurchaseThreshold?: number;

  @IsOptional()
  @IsUUID()
  autoPurchaseBundleId?: string;
}

// Usage Query DTOs
export class UsageQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';
}

// Response DTOs
export class BillingOverviewDto {
  partnerId: string;
  status: string;
  queryBalance: number;
  totalPurchased: number;
  totalUsed: number;
  currentOverage: number;
  overageRate: number;
  alertThreshold: number | null;
  autoPurchaseEnabled: boolean;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  usageThisMonth: number;
  estimatedCost: number;
}

export class UsageSummaryDto {
  date: string;
  queryCount: number;
  blockedCount: number;
  allowedCount: number;
  threatCount: number;
  tenantBreakdown?: TenantUsageDto[];
}

export class TenantUsageDto {
  tenantId: string;
  tenantName: string;
  queryCount: number;
  blockedCount: number;
  percentage: number;
}

