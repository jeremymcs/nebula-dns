// Flux Shield - Admin dashboard stats DTOs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminHealthSummaryDto {
  @ApiProperty({ enum: ['healthy', 'degraded', 'unhealthy'] })
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty()
  healthyServiceCount: number;

  @ApiProperty()
  totalServiceCount: number;

  @ApiProperty()
  isMockData: boolean;
}

export class AdminRecentActivityItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  action: string;

  @ApiPropertyOptional()
  adminEmail?: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  summary?: string;
}

export class AdminDashboardStatsResponseDto {
  @ApiProperty()
  mspCount: number;

  @ApiProperty()
  tenantCount: number;

  @ApiProperty()
  adminCount: number;

  @ApiPropertyOptional({
    description: 'Registered agent installations across all tenants',
    nullable: true,
  })
  agentInstallationCount: number | null;

  @ApiProperty({ type: AdminHealthSummaryDto })
  health: AdminHealthSummaryDto;

  @ApiProperty({ type: [AdminRecentActivityItemDto] })
  recentActivity: AdminRecentActivityItemDto[];
}
