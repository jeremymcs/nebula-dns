// Nebula DNS - Admin Dashboard Stats DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus, TenantTier } from '../../tenants/entities/tenant.entity';

export class DashboardStatNumberDto {
  @ApiProperty({ description: 'Metric value when available', example: 1 })
  value: number;

  @ApiProperty({
    description: 'Whether the metric could be loaded from its data source',
    example: true,
  })
  available: boolean;
}

export class DashboardStatNullableNumberDto {
  @ApiPropertyOptional({
    description: 'Metric value when available',
    example: 452000,
    nullable: true,
  })
  value: number | null;

  @ApiProperty({
    description: 'Whether the metric could be loaded from its data source',
    example: true,
  })
  available: boolean;
}

export class TenantCountByTierDto {
  @ApiProperty({ example: 0 })
  home: number;

  @ApiProperty({ example: 0 })
  enterprise: number;

  @ApiProperty({ example: 1 })
  msp: number;
}

export class TenantCountStatsDto {
  @ApiProperty({ type: DashboardStatNumberDto })
  total: DashboardStatNumberDto;

  @ApiProperty({ type: TenantCountByTierDto })
  byTier: TenantCountByTierDto;

  @ApiProperty({
    description: 'Client organizations managed by MSP tenants',
    type: DashboardStatNumberDto,
  })
  mspClients: DashboardStatNumberDto;
}

export class MspStatusBreakdownDto {
  @ApiProperty({ example: 1 })
  active: number;

  @ApiProperty({ example: 0 })
  suspended: number;

  @ApiProperty({ example: 0 })
  cancelled: number;
}

export class AdminDashboardStatsResponseDto {
  @ApiProperty({ type: DashboardStatNumberDto })
  mspCount: DashboardStatNumberDto;

  @ApiProperty({
    description: 'MSP tenants not in active status',
    type: DashboardStatNumberDto,
  })
  mspPendingCount: DashboardStatNumberDto;

  @ApiProperty({ type: MspStatusBreakdownDto })
  mspByStatus: MspStatusBreakdownDto;

  @ApiProperty({ type: TenantCountStatsDto })
  tenantCount: TenantCountStatsDto;

  @ApiProperty({
    description: 'Distinct tenants with DNS query logs in the last 7 days',
    type: DashboardStatNumberDto,
  })
  activeTenants7d: DashboardStatNumberDto;

  @ApiProperty({
    description:
      'Paid MSP invoice revenue for the current calendar month (America/Chicago), in cents',
    type: DashboardStatNullableNumberDto,
  })
  monthlyRevenueCents: DashboardStatNullableNumberDto;

  @ApiProperty({
    description:
      'Paid MSP invoice revenue for the previous calendar month (America/Chicago), in cents',
    type: DashboardStatNullableNumberDto,
  })
  prevMonthRevenueCents: DashboardStatNullableNumberDto;

  @ApiProperty({
    description:
      'False when billing/subscriptions are not configured (Stripe off at launch)',
    example: false,
  })
  billingEnabled: boolean;

  @ApiProperty({
    description: 'Tenants flagged as demo (slug demo or settings.demo=true)',
    type: DashboardStatNumberDto,
  })
  demoTenantCount: DashboardStatNumberDto;

  @ApiProperty({
    description: 'Snapshot timestamp',
    example: '2026-11-01T00:00:00.000Z',
  })
  timestamp: string;
}

export type MspStatusCounts = Record<TenantStatus, number>;
export type TenantTierCounts = Record<TenantTier, number>;
