// Flux Shield - Admin tenant management DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TenantPlan, TenantStatus, TenantTier } from '../../tenants/entities/tenant.entity';

export class AdminTenantListQueryDto {
  @ApiPropertyOptional({ description: 'Search by name, email, slug, or UUID' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'cancelled'] })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'cancelled'])
  status?: TenantStatus;

  @ApiPropertyOptional({ enum: ['free', 'starter', 'pro', 'enterprise'] })
  @IsOptional()
  @IsEnum(['free', 'starter', 'pro', 'enterprise'])
  plan?: TenantPlan;

  @ApiPropertyOptional({ enum: ['home', 'enterprise', 'msp'] })
  @IsOptional()
  @IsEnum(['home', 'enterprise', 'msp'])
  tier?: TenantTier;

  @ApiPropertyOptional({ description: 'Filter clients of this MSP tenant ID' })
  @IsOptional()
  @IsUUID()
  mspId?: string;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @ApiPropertyOptional({ description: 'Pagination cursor (offset)' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class AdminTenantListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  status: TenantStatus;

  @ApiProperty()
  plan: TenantPlan;

  @ApiProperty()
  tier: TenantTier;

  @ApiPropertyOptional()
  contactEmail: string | null;

  @ApiPropertyOptional()
  managedByMspId: string | null;

  @ApiPropertyOptional()
  managedByMspName: string | null;

  @ApiProperty()
  createdAt: string;
}

export class AdminTenantListResponseDto {
  @ApiProperty({ type: [AdminTenantListItemDto] })
  data: AdminTenantListItemDto[];

  @ApiProperty()
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export class TenantProductModulesDto {
  @ApiProperty()
  dnsFilter: boolean;

  @ApiProperty()
  dnsManagement: boolean;

  @ApiProperty()
  dmarc: boolean;
}

export class TenantLimitsSummaryDto {
  @ApiPropertyOptional()
  locationLimit: number | null;

  @ApiPropertyOptional()
  clientLimit: number | null;

  @ApiPropertyOptional()
  familyMemberLimit: number | null;

  @ApiProperty()
  tier: string;

  @ApiPropertyOptional()
  queriesPerMonth: number | null;
}

export class TenantUsageSummaryDto {
  @ApiProperty()
  totalQueries: number;

  @ApiProperty()
  blockedQueries: number;

  @ApiProperty()
  period: string;

  @ApiProperty()
  isMockData: boolean;

  @ApiProperty()
  analyticsAvailable: boolean;
}

export class AdminTenantUserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  createdAt: string;
}

export class AdminTenantDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  status: TenantStatus;

  @ApiProperty()
  plan: TenantPlan;

  @ApiProperty()
  tier: TenantTier;

  @ApiPropertyOptional()
  contactEmail: string | null;

  @ApiPropertyOptional()
  managedByMspId: string | null;

  @ApiPropertyOptional()
  managedByMspName: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: TenantLimitsSummaryDto })
  limits: TenantLimitsSummaryDto;

  @ApiProperty({ type: TenantProductModulesDto })
  modules: TenantProductModulesDto;

  @ApiProperty()
  userCount: number;

  @ApiProperty()
  agentCount: number;

  @ApiProperty()
  locationCount: number;

  @ApiProperty({ type: [AdminTenantUserSummaryDto] })
  users: AdminTenantUserSummaryDto[];

  @ApiProperty({ type: TenantUsageSummaryDto })
  recentUsage: TenantUsageSummaryDto;
}

export class UpdateTenantLimitsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  locationLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  clientLimit?: number | null;

  @ApiPropertyOptional({ enum: ['free', 'starter', 'pro', 'enterprise'] })
  @IsOptional()
  @IsEnum(['free', 'starter', 'pro', 'enterprise'])
  plan?: TenantPlan;
}

export class UpdateTenantModulesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dnsFilter?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dnsManagement?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dmarc?: boolean;
}

export class AdminTenantActionResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminTenantDetailDto })
  tenant: AdminTenantDetailDto;
}

export class MspUsageTimeSeriesPointDto {
  @ApiProperty()
  bucket: string;

  @ApiProperty()
  queries: number;

  @ApiProperty()
  blocked: number;

  @ApiProperty()
  allowed: number;
}

export class MspUsageTimeSeriesResponseDto {
  @ApiProperty({ type: [MspUsageTimeSeriesPointDto] })
  data: MspUsageTimeSeriesPointDto[];

  @ApiProperty()
  period: string;

  @ApiProperty()
  isMockData: boolean;

  @ApiProperty()
  analyticsAvailable: boolean;
}
